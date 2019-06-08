/**
 * a simple first order ambisonics encoder
 */
pub struct FoaEncoder {
    a_1_0:f32,
    a_1_1:f32,
}

impl FoaEncoder {

    pub fn new() -> FoaEncoder {
        FoaEncoder {
            a_1_0: 1.0,
            a_1_1: 1.0,
        }
    }

    pub fn coefs(&self, azi: f32, ele: f32) -> [f32; 4] {
        let mut coefs = [0.0; 4];

        let sin_a = azi.sin();
        let cos_a = azi.cos();
        let sin_e = ele.sin();
        let cos_e = ele.cos();

        coefs[0] = 1.0;
        coefs[1] = self.a_1_1 * sin_a * sin_e;
        coefs[2] = self.a_1_0 * cos_e;
        coefs[3] = self.a_1_1 * cos_a * sin_e;

        coefs
    }

    pub fn encode_block(&mut self, input: &[f32; 128], azi:f32, ele:f32) -> [[f32; 128]; 4] {
        let coefs = self.coefs(azi, ele);

        let mut enc_block = [[0.0; 128]; 4];

        for i in 0..128 {

            enc_block[0][i] = input[i] * coefs[0];
            enc_block[1][i] = input[i] * coefs[1];
            enc_block[2][i] = input[i] * coefs[2];
            enc_block[3][i] = input[i] * coefs[3];
        }
        enc_block
    }
}

