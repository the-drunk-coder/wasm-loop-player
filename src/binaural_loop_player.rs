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
}

impl BinauralLoopPlayer {
    pub fn new() -> BinauralLoopPlayer {
        BinauralLoopPlayer {
            player: LoopPlayer::new(),
            encoder: FoaEncoder::new(),
            binauralizer: Binauralizer::new(),
        }
    }
    
    pub fn process(&mut self, out_ptr_l: *mut f32, out_ptr_r: *mut f32, size: usize) {
        let buf = self.player.get_next_block();
        
        let out_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr_l, size)};
        for i in 0..size {
            out_buf[i] = buf[i] as f32;
        }
    }

    pub fn set_sample_data_raw(&mut self, in_ptr: *mut f32, sample_size: usize) {
        
        let in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, sample_size)};
        self.player.set_loop(&in_buf.to_vec());
    }
}

