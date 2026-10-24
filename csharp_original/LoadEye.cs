private void btnEye1_Click(object sender, EventArgs e)
        {
            string fileName = null;
            OpenFileDialog openFileDialog = new OpenFileDialog();
            if (openFileDialog.ShowDialog() == DialogResult.OK)
            {
                IsEye = true;
                fileName = openFileDialog.FileName;
                Image<Bgr, Byte> inputImage1 = new Image<Bgr, byte>(fileName);
                Image<Gray, Byte> NormalisedIris = new Image<Gray, byte>(fileName);
                img1 = new Bitmap(fileName);
                pictureBox3.Image = inputImage1.ToBitmap();               

                System.IO.FileInfo fileinfo = new System.IO.FileInfo(fileName);
                IrisImage irisimage = new IrisImage();
                irisimage.Load(fileName);
                irisimage.ProcessIris();
                picSmoothImage.Image = irisimage.SmoothImage.ToBitmap();
                picSegmentedIrisImage.Image = irisimage.SegmentedIrisImage.ToBitmap();

                NormalisedIris = irisimage.Iris.NormalisedIris;
                picNormalisedIris.Image = irisimage.Iris.NormalisedIris.ToBitmap();
                picGaborFilter1.Image = irisimage.Iris.GaborFilter1.ToBitmap();
                picGaborFilter2.Image = irisimage.Iris.GaborFilter2.ToBitmap();
                picGaborFilter3.Image = irisimage.Iris.GaborFilter3.ToBitmap();
                picGaborFilter4.Image = irisimage.Iris.GaborFilter4.ToBitmap();
                picGaborFilter5.Image = irisimage.Iris.GaborFilter5.ToBitmap();
                picGaborFilter6.Image = irisimage.Iris.GaborFilter6.ToBitmap();                

                RGB2Gray(NormalisedIris.ToBitmap(), rgb3);

                string rgbno = "";
                for (int g = 0; g < wide; g++)
                {
                    for (int h = 0; h < height; h++)
                    {
                        rgbno += rgb3[g, h].ToString();
                    }
                    rgbno = rgbno + "\r\n";
                }

                textBox1.Text = rgbno;
            }
            
            
        }
