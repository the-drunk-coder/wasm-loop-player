class MyProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
	return []
    }

    constructor() {
	super()
	this.port.onmessage = e => {
	    if (e.data.type === 'loadWasm') {		
		WebAssembly.instantiate(e.data.data).then(w => {		    
		    this._wasm = w.instance
		    // grow memory to accomodate full sample ... 
		    this._wasm.exports.memory.grow(150)
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
		    this._outPtr = this._wasm.exports.alloc(this._size)		    
		    this._outBuf = new Float32Array (
			this._wasm.exports.memory.buffer,
			this._outPtr,
			this._size
		    )
		})
	    } else if (e.data.type === 'loadSample') {
		this._sample_size = e.data.length
		this._sample_data = e.data.samples
		console.log("sample size:");
		console.log(this._sample_data.length);
		if(this._wasm) {
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
	    }
	}
    }
    	    
    
    process(inputs, outputs, parameters) {
	if (!this._wasm || !this._sample_set) {
	    return true
	}
	
	let output = outputs[0];
	for (let channel = 0; channel < output.length; ++channel) {	    
	    this._wasm.exports.process(this._outPtr, this._size)
	    output[channel].set(this._outBuf)	    
	}

	return true
    }
}

registerProcessor('my-processor', MyProcessor)
