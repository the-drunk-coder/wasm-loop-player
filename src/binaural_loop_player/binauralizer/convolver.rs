extern crate chfft;

extern crate num;
use num::complex::Complex;
use chfft::RFft1D;

/**
 * a simple, non-partitioned block convolver
 */
pub struct BlockConvolver {
    ir_freq_domain: Vec<Complex<f32>>,
    in_freq_domain: Vec<Complex<f32>>,
    fft: RFft1D<f32>,
    out: Vec<f32>,
    len: usize,
}

impl std::clone::Clone for BlockConvolver {

    fn clone(&self) -> Self {        
        let fft = RFft1D::<f32>::new(self.len);

        BlockConvolver {
            ir_freq_domain: self.ir_freq_domain.clone(),
            in_freq_domain: self.in_freq_domain.clone(),
            out: vec![0.0; 128],
            fft: fft,
            len: self.len,
        }
    }
}

impl BlockConvolver {

    // create block convolver from ir
    pub fn from_ir(ir: &[f32; 128]) -> BlockConvolver {

        let mut fft = RFft1D::<f32>::new(ir.len());
        let ir_freq_domain = fft.forward(ir);
        let in_freq_domain = vec![Complex::new(0.0,0.0); ir.len()];
        
        BlockConvolver {
            ir_freq_domain,
            in_freq_domain,            
            fft,
            out: vec![0.0; 128],
            len: ir.len(),            
        }
    }
    
    pub fn convolve(&mut self, input: &[f32; 128]) -> [f32; 128] {

        self.in_freq_domain = self.fft.forward(input);

        // pointwise convolution
        for i in 0..self.in_freq_domain.len(){
            self.in_freq_domain[i] = self.ir_freq_domain[i] * self.in_freq_domain[i];
        }
        
        self.out = self.fft.backward(&self.in_freq_domain);
        
        let mut outarr = [0.0;128];

        for i in 0..128 {
            outarr[i] = self.out[i]; 
        }

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
                    let mut idx = 0;
                    if(i > k) {
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


