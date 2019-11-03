class LoopPlayerProcessor extends AudioWorkletProcessor {
    // The parameter descriptors are part of the API standard.
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
	// Set up the receiving part of the worklet's message port.
	// Use the 'data.type' field to define the handling.
	this.port.onmessage = e => {
	    // Recieve the WebAssembly module (the Rust part) as binary data.
	    // In the setup.js part there's some explanation why this is necessary.
	    // Basically, 'fetch()' calls aren't allowed in the worklet itself.
	    if (e.data.type === 'loadWasm') {

		// Instantiate the WebAssembly module from the received binary data.
		WebAssembly.instantiate(e.data.data).then(w => {

		    // Call wasm module constructor.
		    this._wasm = w.instance

		    // Grow memory to accomodate full sample.
		    this._wasm.exports.memory.grow(250)

		    // Set the blocksize.
		    this._size = 128

		    // If the sample data has already been received (the order isn't necessarily
		    // deterministic), allocate some memory in the linear WebAssembly
		    // memory to hold ths sample and share it with the WebAssembly module.
		    if(this._sample_data) {

			// Receive the pointer.
			this._samplePtr = this._wasm.exports.alloc(this._sample_size)	
			// Create the JS Array in that memory location.
			this._sampleBuf = new Float32Array (
			    this._wasm.exports.memory.buffer,
			    this._samplePtr,
			    this._sample_size
			)
			
			// Copy the sample data to the shared space.
			this._sampleBuf.set(this._sample_data);
			
			// Tell the WebAssembly module which sample to use.
			this._wasm.exports.set_sample_data_raw(this._samplePtr, this._sample_size)

			// Flag for the processing method.
			this._sample_set = true;
		    }

		    // Same procedure as above, just for the impulse response.
		    if(this._ir_data) {
			this._irPtr = this._wasm.exports.alloc(this._ir_size)	
			this._irBuf = new Float32Array (
			    this._wasm.exports.memory.buffer,
			    this._irPtr,
			    this._ir_size
			)
					
			this._irBuf.set(this._ir_data);
			this._wasm.exports.set_ir_data_raw(this._irPtr, this._ir_size)
			this._ir_set = true;
		    }

		    // And once more, for the output buffers.
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
		// Load the sample date from binary data received over the message port.
		this._sample_size = e.data.length
		this._sample_data = e.data.samples
		console.log("sample size: " + this._sample_data.length);

		// If the WebAssembly module is already loaded (the order isn't necessarily
		// deterministic), allocate buffer space (see explanation above).
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
		// Load the sample date from binary data received over the message port.
		this._ir_size = e.data.length
		this._ir_data = e.data.samples
		console.log("ir size: " + this._ir_data.length);
		
		// If the WebAssembly module is already loaded (the order isn't necessarily
		// deterministic), allocate buffer space (see explanation above).
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
	    } else if (e.data.type === 'enable') {
		// Enable playing if WebAssembly module is enabled.
		if(this._wasm) {
		    this._wasm.exports.enable();
		}
	    } else if (e.data.type === 'disable') {
		// Disable playing if WebAssembly module is enabled.
		if(this._wasm) {
		    this._wasm.exports.disable();
		}
	    }
	}
    }
    
    process(inputs, outputs, parameters) {
	if (!this._wasm || !this._sample_set) {
	    return true
	}

	// Set parameters
	this._wasm.exports.set_azimuth(parameters.azimuth[0])
	this._wasm.exports.set_elevation(parameters.elevation[0])
	// get the output buffer (DeInterleaved)
	let output = outputs[0];

	// Process ...
	this._wasm.exports.process(this._outPtr_l, this._outPtr_r, this._size)

	// Set output buffers.
	output[0].set(this._outBuf_l)
	output[1].set(this._outBuf_r)

	return true
    }
}

// Register processor module.
registerProcessor('loop-player-processor', LoopPlayerProcessor)
