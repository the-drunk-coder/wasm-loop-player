class LoopPlayerProcessorJS extends AudioWorkletProcessor {
    static get parameterDescriptors() {
	return [
	    {
		name: 'azimuth',
		defaultValue: 0.0
	    },
	    {
		name: 'elevation',
		defaultValue: -1.57
	    }
	]
    }
    
    constructor(options) {
	super(options)
	
	this.port.onmessage = e => {
	    // unfortunately, this seems to be the only way to load
	    // the wasm module in the worklet.
	    // we have to fetch it here because the worklet scope doesn't expose
	    // 'fetch()'
	    if (e.data.type === 'loadSample') {		
		// same with the sample ... 
		this._sample_size = e.data.length
		this._sample_data = e.data.samples

		// set up sample buffer
		console.log("sample size: " + this._sample_data.length);
		this._sampleBuf = new Float32Array (this._sample_size);
		this._sampleBuf.set(this._sample_data);
		this._sampleIdx = 0;
		
		// set up ambi buffer
		this._ambiBuf_acn0 = new Float32Array (128);
		this._ambiBuf_acn1 = new Float32Array (128);
		this._ambiBuf_acn2 = new Float32Array (128);
		this._ambiBuf_acn3 = new Float32Array (128);

		// set up ambi coefs
		this._ambiCoefs = new Float32Array (4);

		// 8 convolution temp buffers and indices
		this._convTmp_0_0 = new Float32Array (256);
		this._convTmp_0_1 = new Float32Array (256);
		this._convTmp_0_2 = new Float32Array (256);
		this._convTmp_0_3 = new Float32Array (256);

		this._convTmp_1_0 = new Float32Array (256);
		this._convTmp_1_1 = new Float32Array (256);
		this._convTmp_1_2 = new Float32Array (256);
		this._convTmp_1_3 = new Float32Array (256);

		this._tmpOutLeft = new Float32Array (128);
		this._tmpOutRight = new Float32Array (128);

		// for the time domain conv
		this._delIdx = new Array(8);
		this._delIdx[0] = 0;
		this._delIdx[1] = 0;
		this._delIdx[2] = 0;
		this._delIdx[3] = 0;
		this._delIdx[4] = 0;
		this._delIdx[5] = 0;
		this._delIdx[6] = 0;
		this._delIdx[7] = 0;
		
		// load to loop player
		this._sample_set = true;		
	    } else if (e.data.type === 'loadIr') {
		// same with the sample ... 
		this._ir_size = e.data.length
		this._ir_data = e.data.samples
		this._irBuf = new Float32Array (this._ir_size);
		this._irBuf.set(this._ir_data);
		
		console.log("ir size: " + this._ir_data.length);

		this._irBuf_left_0 = new Float32Array ( 128 );
		this._irBuf_left_1 = new Float32Array ( 128 );
		this._irBuf_left_2 = new Float32Array ( 128 );
		this._irBuf_left_3 = new Float32Array ( 128 );
		this._irBuf_right_0 = new Float32Array ( 128 );
		this._irBuf_right_1 = new Float32Array ( 128 );
		this._irBuf_right_2 = new Float32Array ( 128 );
		this._irBuf_right_3 = new Float32Array ( 128 );

		// load to individual ir buffers
		var i = 0;
		for (i = 0; i < 128; i++) {
		    this._irBuf_left_0[i] = this._irBuf[i];
		    this._irBuf_left_1[i] = this._irBuf[128 + i];
		    this._irBuf_left_2[i] = this._irBuf[256 + i];
		    this._irBuf_left_3[i] = this._irBuf[384 + i];
		    this._irBuf_right_0[i] = this._irBuf[512 + i];
		    this._irBuf_right_1[i] = this._irBuf[640 + i];
		    this._irBuf_right_2[i] = this._irBuf[768 + i];
		    this._irBuf_right_3[i] = this._irBuf[896 + i];		    
		}
		
		// load to loop player		
		this._ir_set = true;		
	    } 
	}
    }

    convolve (inbuf, ir, outbuf, tmp_buf, idx_idx) {
	var i = 0;
	for (i = 0; i < 128; i++) {
	    tmp_buf[this._delIdx[idx_idx] + i] = inbuf[i];
        }
	
        if (this._delIdx[idx_idx] == 0) {
	    var k = 0;
	    var j = 0;
	    for (k = 0; k < 128; k++) {
                for (j = 0; j < 128; j++) {
		    var idx = 0;
		    if (j > k)  {
                        idx = 256 - (j - k);
		    } else {
                        idx = k - j;
		    }                                                            
		    outbuf[k] += ir[j] * tmp_buf[idx];
                }
	    }
	    this._delIdx[idx_idx] = 128;
        } else if (this._delIdx[idx_idx] == 128) {
	    var k = 0;
	    var j = 0;
	    for (k = 0; k < 128; k++) {
                for (j = 0; j < 128; j++) {			
		    outbuf[k] += ir[j] * tmp_buf[(this._delIdx[idx_idx] + k) - j];
                }
	    }
	    this._delIdx[idx_idx] = 0;
        }		 
    }
    
    process(inputs, outputs, parameters) {
	if (!this._sample_set || !this._ir_set) {
	    return true
	}

	let sin_a = Math.sin(parameters.azimuth[0]);
        let cos_a = Math.cos(parameters.azimuth[0]);
        let sin_e = Math.sin(parameters.elevation[0]);
        let cos_e = Math.cos(parameters.elevation[0]);
		
	//  get ambi coefs ...
        this._ambiCoefs[0] = 1.0;
        this._ambiCoefs[1] = sin_a * sin_e;
        this._ambiCoefs[2] = cos_e;
        this._ambiCoefs[3] = cos_a * sin_e;

	// encode ambisonics ...
	var i = 0;
	for (i = 0; i < 128; i++) {
	    let cur_idx = this._sampleIdx + i;

	    if(cur_idx > this._sample_size) {
		this._sampleIdx = 0;
		cur_idx = i;
	    } 

	    this._ambiBuf_acn0[i] = this._sampleBuf[cur_idx] * this._ambiCoefs[0];
            this._ambiBuf_acn1[i] = this._sampleBuf[cur_idx] * this._ambiCoefs[1];
            this._ambiBuf_acn2[i] = this._sampleBuf[cur_idx] * this._ambiCoefs[2];
            this._ambiBuf_acn3[i] = this._sampleBuf[cur_idx] * this._ambiCoefs[3];
	}

	this._sampleIdx += 128;
	
	// awkwardly explicit binauralization
	let output = outputs[0];

	this._tmpOutLeft.fill(0);
	this._tmpOutRight.fill(0);
	this.convolve(this._ambiBuf_acn0, this._irBuf_left_0, this._tmpOutLeft, this._convTmp_0_0, 0);
	this.convolve(this._ambiBuf_acn0, this._irBuf_right_0, this._tmpOutRight, this._convTmp_1_0, 1);
	for (i = 0; i < 128; i++) {
	    output[0][i] += this._tmpOutLeft[i];
	    output[1][i] += this._tmpOutRight[i];
	}
	this._tmpOutLeft.fill(0);
	this._tmpOutRight.fill(0);
	this.convolve(this._ambiBuf_acn1, this._irBuf_left_1, this._tmpOutLeft, this._convTmp_0_1, 2);
	this.convolve(this._ambiBuf_acn1, this._irBuf_right_1, this._tmpOutRight, this._convTmp_1_1, 3);
	for (i = 0; i < 128; i++) {
	    output[0][i] += this._tmpOutLeft[i];
	    output[1][i] += this._tmpOutRight[i];
	}
	this._tmpOutLeft.fill(0);
	this._tmpOutRight.fill(0);
	this.convolve(this._ambiBuf_acn2, this._irBuf_left_2, this._tmpOutLeft, this._convTmp_0_2, 4);
	this.convolve(this._ambiBuf_acn2, this._irBuf_right_2, this._tmpOutRight, this._convTmp_1_2, 5);
	for (i = 0; i < 128; i++) {
	    output[0][i] += this._tmpOutLeft[i];
	    output[1][i] += this._tmpOutRight[i];
	}
	this._tmpOutLeft.fill(0);
	this._tmpOutRight.fill(0);
	this.convolve(this._ambiBuf_acn3, this._irBuf_left_3, this._tmpOutLeft, this._convTmp_0_3, 6);
	this.convolve(this._ambiBuf_acn3, this._irBuf_right_3, this._tmpOutRight, this._convTmp_1_3, 6);
	for (i = 0; i < 128; i++) {
	    output[0][i] += this._tmpOutLeft[i];
	    output[1][i] += this._tmpOutRight[i];
	}
	
	return true
    }
}

registerProcessor('loop-player-processor-js', LoopPlayerProcessorJS)
