// Get the audio context.
// Omitting the low latency hint for simplicity.
const ctx = new AudioContext({
  sampleRate: 44100,
})

// Not all Browsers currently support the AudioWorklet.
if (ctx.audioWorklet === undefined) {
    alert("AudioWorklet isn't supported... It cannot work.")
} else {  
    // First, load the AudioWorklet module.
    ctx.audioWorklet.addModule('js/worklet.js?t=' + new Date().getTime())
	.then(() => {

	    ///////////////////////////////
	    // BASIC WEB AUDIO API SETUP //
	    ///////////////////////////////	    
	    
	    // once the module has been loaded, create the DSP graph
	    const n = new AudioWorkletNode(ctx, 'loop-player-processor', { numberOfInputs: 1,
									   numberOfOutputs: 1,
									   outputChannelCount: [2], } );
	    // Activate the node by connecting it to the output.
	    n.connect(ctx.destination)

	    //////////////////
	    // GUI ELEMENTS //
	    //////////////////
	    
	    // This button activates or deactivates the sample player.
	    // Automatic playback is not allowed.
	    const autoPlay = document.getElementById('auto-play')
	    autoPlay.addEventListener('change', e => {
		if (e.target.value === 0) {
		    n.port.postMessage({ type: 'disable', })
		} else {
		    if(ctx.state === "suspended") {
			ctx.resume();
		    }
		    n.port.postMessage({ type: 'enable', })
		}
	    })

	    // Azimuth slider.
	    const azi = document.getElementById('azimuth-slider')
	    azi.addEventListener('input', e => {
		n.parameters.get('azimuth').value = e.target.value
	    })

	    // Elevation slider.
	    const ele = document.getElementById('elevation-slider')
	    ele.addEventListener('input', e => {
		n.parameters.get('elevation').value = e.target.value
	    })

	    //////////////////////////////
	    // ADDITIONAL WORKLET SETUP //
	    //////////////////////////////
	   
	    // Here's one of the crucial challenges. The WebAudio API currently doesn't              
	    // allow any fetch(...) calls in the worklet module itself.
	    //
	    // This is why we need to fetch everything in the main thread and post it (as binary data) 
	    // to the worklet using the worklet using the message port facilities.
	    //
	    // This doesn't only include the sample files, but also the WebAssembly module itself.
	    //
	    // In the worklet you'll find the other end of the message port.

	    // Fetch the actual sample.
	    fetch('audio/amen.flac?t=' + new Date().getTime())
		.then(r => r.arrayBuffer())
		.then(r => ctx.decodeAudioData(r)
		      .then(r => n.port.postMessage({ type: 'loadSample', samples: r.getChannelData(0), length: r.length })))

	    // Fetch the impulse response we need for the binaural processing.
	    fetch('audio/ir.flac?t=' + new Date().getTime())
		.then(r => r.arrayBuffer())
		.then(r => ctx.decodeAudioData(r)
		      .then(r => n.port.postMessage({ type: 'loadIr', samples: r.getChannelData(0), length: r.length })))

	    // Fetch the WebAssembly module which contains our main DSP logic.
	    fetch('wasm/wasm_loop_player.wasm?t=' + new Date().getTime())
		.then(r => r.arrayBuffer())
		.then(r => n.port.postMessage({ type: 'loadWasm', data: r }))	    
	})
    // If successful, post samplerate ...
    console.log("Samplerate: " + ctx.sampleRate);    
}
