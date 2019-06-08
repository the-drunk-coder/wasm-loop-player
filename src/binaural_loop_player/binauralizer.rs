pub mod convolver;
use convolver::*;
/**
 * a simple first-order convolution binauralizer
 */
pub struct Binauralizer {
    left: Vec<BlockConvolver>,
    right: Vec<BlockConvolver>,
}

impl Binauralizer {

    // initialize with unit IRs 
    pub fn new() -> Binauralizer {
        let mut ir = vec![0.0; 128];
        ir[1] = 1.0;
        
        let left = vec![BlockConvolver::from_ir(&ir); 4];
        let right = vec![BlockConvolver::from_ir(&ir); 4];

        Binauralizer {
            left,
            right,
        }            
    }

    pub fn binauralize(&mut self, input: [[f32; 128]; 4]) -> [[f32; 128]; 2] {
        let mut bin_block = [[0.0; 128]; 2];
                                    
        for ach in 0..4 {
            let lch = self.left[ach].convolve(&input[ach]);
            let rch = self.right[ach].convolve(&input[ach]);
            for fr in 0..128 {                               
                bin_block[0][fr] = lch[0] + lch[1] + lch[2] + lch[3];
                bin_block[1][fr] = rch[0] + rch[1] + rch[2] + rch[3];
            }
        }

        bin_block        
    }
}
