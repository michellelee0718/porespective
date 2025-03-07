import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer"; 

dotenv.config({path: '../../../.env'}); 

const app = express();
const PORT = 3000; 
const corsOptions = {
   origin: '*',  
   optionsSuccessStatus: 200 
};

app.use(express.json());
app.use(cors(corsOptions));


const transporter = nodemailer.createTransport({
   host: process.env.SMTP_HOST,
   port: 587,
   secure: false, 
   auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS
   }
});


// Email sending endpoint
app.post('/send-email', async (req, res) => {
   try {
       const { subject, email, message } = req.body; // Destructure and retrieve data from request body.

       if (!subject || !email || !message) {
           return res.status(400).json({ status: 'error', message: 'Missing required fields' });
       }

       const mailOptions = {
           from: process.env.SENDER_EMAIL, 
           to: `<${email}>`, 
           subject: subject, 
           text: message 
       };

       const info = await transporter.sendMail(mailOptions);
       res.status(200).json({ status: 'success', message: 'Email sent successfully' });
   } catch (err) {
       console.error('Error sending email:', err);
       res.status(500).json({ status: 'error', message: 'Error sending email, please try again.' });
   }
});

app.listen(PORT, () => {
   console.log(`Server is running on port ${PORT}`);
});
