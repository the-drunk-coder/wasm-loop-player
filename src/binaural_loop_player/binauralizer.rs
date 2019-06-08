pub mod convolver;
use convolver::*;
/**
 * a simple first-order convolution binauralizer
 */
pub struct Binauralizer {
    left: Vec<TimeDomainConvolver>,
    right: Vec<TimeDomainConvolver>,
}

impl Binauralizer {

    // initialize with unit IRs 
    pub fn new() -> Binauralizer {
        let mut ir = [0.0; 128];
        ir[1] = 1.0;
        
        let left = vec![TimeDomainConvolver::from_ir(&ir); 4];
        let right = vec![TimeDomainConvolver::from_ir(&ir); 4];

        Binauralizer {
            left,
            right,
        }            
    }

    fn to_array(sli: &[f32]) -> [f32; 128] {
        let mut arr = [0.0;128];
        for i in 0..128 {
            arr[i] = sli[i];
        }
        arr
    }
    
    pub fn set_ir(&mut self, ir: &[f32]) {
        self.left[0] = TimeDomainConvolver::from_ir(&Binauralizer::to_array(&ir[0..128]));
        self.left[1] = TimeDomainConvolver::from_ir(&Binauralizer::to_array(&ir[128..256]));
        self.left[2] = TimeDomainConvolver::from_ir(&Binauralizer::to_array(&ir[256..384]));
        self.left[3] = TimeDomainConvolver::from_ir(&Binauralizer::to_array(&ir[384..512]));
        self.right[0] = TimeDomainConvolver::from_ir(&Binauralizer::to_array(&ir[512..640]));
        self.right[1] = TimeDomainConvolver::from_ir(&Binauralizer::to_array(&ir[640..768]));
        self.right[2] = TimeDomainConvolver::from_ir(&Binauralizer::to_array(&ir[768..896]));
        self.right[3] = TimeDomainConvolver::from_ir(&Binauralizer::to_array(&ir[896..1024]));                       
    }
    
    pub fn binauralize(&mut self, input: &[[f32; 128]; 4]) -> [[f32; 128]; 2] {
        let mut bin_block = [[0.0; 128]; 2];
                                    
        for ach in 0..4 {
            let lch = self.left[ach].convolve(&input[ach]);
            let rch = self.right[ach].convolve(&input[ach]);
            for fr in 0..128 {                               
                bin_block[0][fr] += lch[fr];
                bin_block[1][fr] += rch[fr];
            }
        }

        bin_block        
    }
}
