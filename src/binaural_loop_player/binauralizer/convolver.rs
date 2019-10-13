extern crate chfft;
extern crate num;

use num::complex::Complex;
use chfft::RFft1D;

/**
 * A simple, non-partitioned block convolver.
 * Uses the Overlap-Save method (also called Overlap-Scrap) for block convolution.
 */
pub struct BlockConvolver {
    ir_freq_domain: Vec<Complex<f32>>,
    in_freq_domain: Vec<Complex<f32>>,
    fft: RFft1D<f32>,
    tmp_in: Vec<f32>,
    tmp_out: Vec<f32>,
    remainder: Vec<f32>,
    len: usize,
}

impl std::clone::Clone for BlockConvolver {

    fn clone(&self) -> Self {        
        let fft = RFft1D::<f32>::new(self.len);

        BlockConvolver {
            ir_freq_domain: self.ir_freq_domain.clone(),
            in_freq_domain: self.in_freq_domain.clone(),
            fft: fft,
            tmp_in: vec![0.0; 256],
            tmp_out: vec![0.0; 256],
            remainder: vec![0.0; 128],            
            len: self.len,
        }
    }
}

impl BlockConvolver {

    // create block convolver from ir
    pub fn from_ir(ir: &[f32; 128]) -> BlockConvolver {

        let mut fft = RFft1D::<f32>::new(ir.len() * 2);

        // zero-pad impulse response (to match IR lenght)
        let mut ir_zeropad = [0.0; 256];
        for i in 0..128 {
            ir_zeropad[i] = ir[i];
        }
        
        BlockConvolver {
            ir_freq_domain: fft.forward(&ir_zeropad),
            in_freq_domain: vec![Complex::new(0.0,0.0); ir.len() * 2],       
            fft: fft,
            tmp_in: vec![0.0; 256],
            tmp_out: vec![0.0; 256],
            remainder: vec![0.0; 128],            
            len: ir.len() * 2,            
        }
    }
    
    pub fn convolve(&mut self, input: &[f32; 128]) -> [f32; 128] {

        // assemble input block from remainder part from previous block
        // (in this case, as filter length is always equal to blocksize,
        // the remainder is just the previous block)
        for i in 0..128 {
            self.tmp_in[i] = self.remainder[i];
            self.tmp_in[i + 128] = input[i];                
        }

        // perform fft
        self.in_freq_domain = self.fft.forward(&self.tmp_in);
 
        // pointwise convolution
        for i in 0..self.in_freq_domain.len(){
            self.in_freq_domain[i] = self.ir_freq_domain[i] * self.in_freq_domain[i];
        }

        // ifft
        self.tmp_out = self.fft.backward(&self.in_freq_domain);

        // copy relevant part from ifft, scrap the rest 
        let mut outarr = [0.0; 128];
        for i in 0..128 {
            self.remainder[i] = input[i];
            outarr[i] = self.tmp_out[i + 128]; 
        }

        // return result block ...
        outarr
    }
}

pub struct TimeDomainConvolver {
    ir: [f32; 128],
    delay: [f32; 256],
    delay_idx: usize,
}

impl std::clone::Clone for TimeDomainConvolver {
    
    fn clone(&self) -> Self {        
        let mut ir = [0.0; 128];
        let mut delay = [0.0; 256];

        for i in 0..128 {
            ir[i] = self.ir[i];
            delay[i] = self.delay[i];
        }

        for i in 128..256 {
            delay[i] = self.delay[i];
        }
        
        TimeDomainConvolver {
            ir,
            delay,
            delay_idx: self.delay_idx            
        }
    }
}

impl TimeDomainConvolver {
    pub fn from_ir(ir: &[f32; 128]) -> TimeDomainConvolver {
        let mut n_ir = [0.0; 128];
        for i in 0..128 {
            n_ir[i] = ir[i];
        }
        
        TimeDomainConvolver {
            ir: n_ir,
            delay: [0.0; 256],
            delay_idx: 128,
        }
    }
    
    pub fn convolve(&mut self, input: &[f32; 128]) -> [f32; 128] {
        let mut out = [0.0; 128];

        for k in 0..128 {
            self.delay[self.delay_idx + k] = input[k];
        }

        if self.delay_idx == 0 {
            for k in 0..128 {
                for i in 0..128 {
                    let mut idx;
                    if i > k  {
                        idx = 256 - (i - k);
                    } else {
                        idx = k - i;
                    }                                                            
                    out[k] += self.ir[i] * self.delay[idx];
                }
            }
            self.delay_idx = 128;
        } else if self.delay_idx == 128 {
            for k in 0..128 {
                for i in 0..128 {
                    out[k] += self.ir[i] * self.delay[(self.delay_idx + k) - i];
                }
            }
            self.delay_idx = 0;
        }
        
        out 
    }
}

mod tests {
    // Note this useful idiom: importing names from outer (for mod tests) scope.
    use super::*;
    use std::f32::consts::PI;
    
    #[test]
    fn test_freq_domain_impulse_convolution() {
        // test convolution with impulse ...
        let mut ir = [0.0; 128];
        ir[0] = 1.0;

        let mut signal_in = [0.0; 128];
        let mut signal_out = [0.0; 128];

        let mut conv = BlockConvolver::from_ir(&ir);

        let mut dev_accum = 0.0;
        
        for b in 0.. 100 {
            for i in 0..128 {
                let pi_idx = ((b * 128 + i) as f32) * PI;
                signal_in[i] = ((220.0 / 44100.0) * pi_idx).sin();
                signal_in[i] += ((432.0 / 44100.0) * pi_idx).sin();
                signal_in[i] += ((648.0 / 44100.0) * pi_idx).sin();
            }
            let mut signal_out = conv.convolve(&signal_in);
            for i in 0..128 {
                dev_accum += (signal_out[i] - signal_in[i]) * (signal_out[i] - signal_in[i]);
            }
        }
        
        assert_approx_eq::assert_approx_eq!(dev_accum / (100.0 * 128.0) , 0.0, 0.00001);
    }
}




