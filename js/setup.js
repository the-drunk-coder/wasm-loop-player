const ctx = new AudioContext({
  latencyHint: 'interactive',
  sampleRate: 44100,
})

if (ctx.audioWorklet === undefined) {
    alert("AudioWorklet isn't supported... It cannot work.")
} else {  
    ctx.audioWorklet.addModule('js/worklet.js?t=' + new Date().getTime())
	.then(() => {
	    const n = new AudioWorkletNode(ctx, 'loop-player-processor', { numberOfInputs: 1,
									   numberOfOutputs: 1,
									   outputChannelCount: [2], } );
	    n.connect(ctx.destination)
	    
	    fetch('wasm/wasm_loop_player.wasm?t=' + new Date().getTime())
		.then(r => r.arrayBuffer())
		.then(r => n.port.postMessage({ type: 'loadWasm', data: r }))
	    
	    fetch('audio/amen.wav?t=' + new Date().getTime())
		.then(r => r.arrayBuffer())
		.then(r => ctx.decodeAudioData(r)
		      .then(r => n.port.postMessage({ type: 'loadSample', samples: r.getChannelData(0), length: r.length })))})

    console.log("sr: ");
    console.log(ctx.sampleRate);

    const autoPlay = document.getElementById('auto-play')
    autoPlay.addEventListener('change', e => {
	if (e.target.value === 1) {
            ctx.resume()
	} else {
            ctx.suspend()
	}
    })
}
