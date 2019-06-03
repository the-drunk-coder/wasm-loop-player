const ctx = new AudioContext()
if (ctx.audioWorklet === undefined) {
    alert("AudioWorklet isn't supported... It cannot work.")
} else {    
    ctx.audioWorklet.addModule('js/worklet.js?t=' + new Date().getTime())
	.then(() => {
	    const n = new AudioWorkletNode(ctx, 'loop-player-processor')
	    n.connect(ctx.destination)
	    
	    fetch('wasm/wasm_loop_player.wasm?t=' + new Date().getTime())
		.then(r => r.arrayBuffer())
		.then(r => n.port.postMessage({ type: 'loadWasm', data: r }))
	    
	    fetch('audio/amen.wav?t=' + new Date().getTime())
		.then(r => r.arrayBuffer())
		.then(r => ctx.decodeAudioData(r)
		      .then(r => n.port.postMessage({ type: 'loadSample', samples: r.getChannelData(0), length: r.length })))})

    const autoPlay = document.getElementById('auto-play')
    autoPlay.addEventListener('change', e => {
	if (e.target.value === 1) {
            ctx.resume()
	} else {
            ctx.suspend()
	}
    })
}
