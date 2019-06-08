class LoopPlayerProcessor extends AudioWorkletProcessor {
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
	    if (e.data.type === 'loadWasm') {
		WebAssembly.instantiate(e.data.data).then(w => {		    
		    this._wasm = w.instance
		    // grow memory to accomodate full sample ... 
		    this._wasm.exports.memory.grow(250)
		    this._size = 128
		    // WHY IS THE ALLOCATION ORDER IMPORTANT HERE ??
		    // BYTE OFFSET ??
		    if(this._sample_data) {
			this._samplePtr = this._wasm.exports.alloc(this._sample_size)	
			this._sampleBuf = new Float32Array (
			    this._wasm.exports.memory.buffer,
			    this._samplePtr,
			    this._sample_size
			)
			
			// copy to wasm buffer
			this._sampleBuf.set(this._sample_data);
			this._wasm.exports.set_sample_data_raw(this._samplePtr, this._sample_size)
			this._sample_set = true;
		    }
		    if(this._ir_data) {
			this._irPtr = this._wasm.exports.alloc(this._ir_size)	
			this._irBuf = new Float32Array (
			    this._wasm.exports.memory.buffer,
			    this._irPtr,
			    this._ir_size
			)
			
			// copy to wasm buffer
			this._irBuf.set(this._ir_data);
			this._wasm.exports.set_ir_data_raw(this._irPtr, this._ir_size)
			this._ir_set = true;
		    }
		    this._outPtr_r = this._wasm.exports.alloc(this._size)		    
		    this._outBuf_r = new Float32Array (
			this._wasm.exports.memory.buffer,
			this._outPtr_r,
			this._size
		    )
		    this._outPtr_l = this._wasm.exports.alloc(this._size)		    
		    this._outBuf_l = new Float32Array (
			this._wasm.exports.memory.buffer,
			this._outPtr_l,
			this._size
		    )
		})		
	    } else if (e.data.type === 'loadSample') {
		// same with the sample ... 
		this._sample_size = e.data.length
		this._sample_data = e.data.samples
		console.log("sample size: " + this._sample_data.length);
		if(this._wasm) {
		    this._samplePtr = this._wasm.exports.alloc(this._sample_size)	
		    this._sampleBuf = new Float32Array (
			this._wasm.exports.memory.buffer,
			this._samplePtr,
			this._sample_size
		    )		
		    // copy to wasm buffer 
		    this._sampleBuf.set(this._sample_data);
		    // load to loop player
		    this._wasm.exports.set_sample_data_raw(this._samplePtr, this._sample_size)
		    this._sample_set = true;
		}
	    } else if (e.data.type === 'loadIr') {
		// same with the sample ... 
		this._ir_size = e.data.length
		this._ir_data = e.data.samples
		console.log("ir size: " + this._ir_data.length);
		if(this._wasm) {
		    this._irPtr = this._wasm.exports.alloc(this._ir_size)	
		    this._irBuf = new Float32Array (
			this._wasm.exports.memory.buffer,
			this._irPtr,
			this._ir_size
		    )		
		    // copy to wasm buffer 
		    this._irBuf.set(this._ir_data);
		    // load to loop player
		    this._wasm.exports.set_ir_data_raw(this._irPtr, this._ir_size)
		    this._ir_set = true;
		}
	    }
	}
    }
    
    process(inputs, outputs, parameters) {
	if (!this._wasm || !this._sample_set) {
	    return true
	}

	this._wasm.exports.set_azimuth(parameters.azimuth[0])
	this._wasm.exports.set_elevation(parameters.elevation[0])
	
	let output = outputs[0];
	this._wasm.exports.process(this._outPtr_l, this._outPtr_r, this._size)
	output[0].set(this._outBuf_l)
	output[1].set(this._outBuf_r)

	return true
    }
}

registerProcessor('loop-player-processor', LoopPlayerProcessor)
