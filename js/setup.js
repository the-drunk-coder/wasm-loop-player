const ctx = new AudioContext({
  sampleRate: 44100,
})

if (ctx.audioWorklet === undefined) {
    alert("AudioWorklet isn't supported... It cannot work.")
} else {  
    ctx.audioWorklet.addModule('js/worklet_js.js?t=' + new Date().getTime())
	.then(() => {
	    console.log("load");
	    const n = new AudioWorkletNode(ctx, 'loop-player-processor-js', { numberOfInputs: 1,
									      numberOfOutputs: 1,
									      outputChannelCount: [2], } );
	    console.log("connect");    
	    n.connect(ctx.destination)

	    const autoPlay = document.getElementById('auto-play')
	    autoPlay.addEventListener('change', e => {
		if (e.target.value === 0) {
		    ctx.suspend();
		} else {
		    if(ctx.state === "suspended") {
			ctx.resume();
		    }
		}
	    })
	    
	    const azi = document.getElementById('azimuth-slider')
	    azi.addEventListener('input', e => {
		n.parameters.get('azimuth').value = e.target.value
	    })
	    
	    const ele = document.getElementById('elevation-slider')
	    ele.addEventListener('input', e => {
		n.parameters.get('elevation').value = e.target.value
	    })
	    
	    fetch('audio/amen.flac?t=' + new Date().getTime())
		.then(r => r.arrayBuffer())
		.then(r => ctx.decodeAudioData(r)
		      .then(r => n.port.postMessage({ type: 'loadSample', samples: r.getChannelData(0), length: r.length })))
	    
	    fetch('audio/ir.flac?t=' + new Date().getTime())
		.then(r => r.arrayBuffer())
		.then(r => ctx.decodeAudioData(r)
		      .then(r => n.port.postMessage({ type: 'loadIr', samples: r.getChannelData(0), length: r.length })))
	})
   
    console.log("sr: " + ctx.sampleRate);    
}
