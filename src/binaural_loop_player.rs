pub mod loop_player;
pub mod ambisonics;
pub mod binauralizer;

use loop_player::*;
use ambisonics::*;
use binauralizer::*;

pub struct BinauralLoopPlayer {
    player: LoopPlayer,
    encoder: FoaEncoder,
    binauralizer: Binauralizer,
    azimuth: f32,
    elevation: f32,
    enabled: bool,
}

impl BinauralLoopPlayer {
    pub fn new() -> BinauralLoopPlayer {
        BinauralLoopPlayer {
            player: LoopPlayer::new(),
            encoder: FoaEncoder::new(),
            binauralizer: Binauralizer::new(),
            azimuth: 0.0,
            elevation: 0.0,
            enabled: false,
        }
    }

    pub fn enable(&mut self) {
        self.enabled = true;
    }

    pub fn disable(&mut self) {
        self.enabled = false;
    }
    
    pub fn process(&mut self, out_ptr_l: *mut f32, out_ptr_r: *mut f32, size: usize) {

        if(self.enabled){                                    
            let buf = self.player.get_next_block();
            let buf_ambi = self.encoder.encode_block(&buf, self.azimuth, self.elevation);
            let buf_bin = self.binauralizer.binauralize(&buf_ambi);
            
            let out_buf_l: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr_l, size)};
            let out_buf_r: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr_r, size)};
            for i in 0..size {
                out_buf_l[i] = buf_bin[0][i] as f32;
                out_buf_r[i] = buf_bin[1][i] as f32;
            }
        } else {
            let out_buf_l: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr_l, size)};
            let out_buf_r: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr_r, size)};
            for i in 0..size {
                out_buf_l[i] = 0.0;
                out_buf_r[i] = 0.0;
            }
        }
    }

    pub fn set_sample_data_raw(&mut self, in_ptr: *mut f32, sample_size: usize) {        
        let in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, sample_size)};
        self.player.set_loop(&in_buf);
    }

    pub fn set_ir_data(&mut self, in_ptr: *mut f32, sample_size: usize) {        
        let in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, sample_size)};
        self.binauralizer.set_ir(&in_buf);
    }

    pub fn set_azimuth(&mut self, azi: f32) {                
        self.azimuth = azi;
    }

    pub fn set_elevation(&mut self, ele: f32) {                
        self.elevation = ele;
    }
}

