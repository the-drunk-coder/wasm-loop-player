pub struct LoopPlayer {
    pub index: usize,
    pub loop_buffer: Vec<f32>,
}

impl LoopPlayer {
    pub fn new() -> LoopPlayer {
        LoopPlayer {
            index: 0,
            loop_buffer: vec![0.0; 128]
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

    pub fn process(&mut self, out_ptr: *mut f32, size: usize) {
        let buf = self.get_next_block();
        let out_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr, size)};
        for i in 0..size {
            out_buf[i] = buf[i] as f32;
        }
    }
    
    pub fn set_sample_data_raw(&mut self, in_ptr: *mut f32, sample_size: usize) {
        self.loop_buffer.resize(sample_size, 0.0);
        self.index = 0;
        let in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, sample_size)};
        for i in 0..sample_size {
            self.loop_buffer[i] = in_buf[i] as f32;
        }
    }
}
