import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

export const sendAppointmentConfirmation = async (userEmail, appointmentDetails) => {
  const subject = 'Appointment Confirmation - Healthcare Consultation';
  const html = `
    <h2>Appointment Confirmation</h2>
    <p>Dear ${appointmentDetails.patientName},</p>
    <p>Your appointment has been confirmed with the following details:</p>
    <ul>
      <li><strong>Doctor:</strong> ${appointmentDetails.doctorName}</li>
      <li><strong>Date:</strong> ${appointmentDetails.date}</li>
      <li><strong>Time:</strong> ${appointmentDetails.time}</li>
      <li><strong>Reason:</strong> ${appointmentDetails.reason}</li>
    </ul>
    <p>Please arrive 10 minutes early for your appointment.</p>
    <p>Best regards,<br>Healthcare Consultation Team</p>
  `;

  return sendEmail(userEmail, subject, html);
};