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
    pub fn from_ir(ir: &Vec<f32>) -> BlockConvolver {

        let mut fft = RFft1D::<f32>::new(ir.len());
        let ir_freq_domain = fft.forward(ir.as_slice());

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

