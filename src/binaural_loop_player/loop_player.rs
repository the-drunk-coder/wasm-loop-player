/**
 * a very simple loop player ...
 */
pub struct LoopPlayer {
    index: usize,
    loop_buffer: Vec<f32>,
}

impl LoopPlayer {
    
    pub fn new() -> LoopPlayer {        
        LoopPlayer {
            index: 0,
            loop_buffer: vec![0.0; 128],
        }
    }

    pub fn get_next_block(&mut self) -> [f32; 128] {
        let mut out_buf: [f32; 128] = [0.0; 128];

        for i in 0..128 {            
            out_buf[i] = self.loop_buffer[self.index];
            
            if (self.index + 1) < self.loop_buffer.len() {
                self.index = self.index + 1;
            } else {
                self.index = 0;
            }
        }
        out_buf
    }

    pub fn set_loop(&mut self, samples:&[f32]) {
        self.loop_buffer.resize(samples.len(), 0.0);
        self.index = 0;
        for i in 0..samples.len() {
            self.loop_buffer[i] = samples[i] as f32;
        }
    }
}

