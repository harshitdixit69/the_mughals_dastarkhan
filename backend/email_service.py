"""
Email utilities for sending confirmation emails
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import SMTP_SERVER, SMTP_PORT, SENDER_EMAIL, SENDER_PASSWORD, SENDER_NAME

logger = logging.getLogger(__name__)


def send_reservation_confirmation_email(guest_name: str, email: str, date: str, time: str, party_size: int):
    """Send reservation confirmation email"""
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Reservation Confirmed - The Mughal's Dastarkhwan"
        message["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        message["To"] = email
        
        # HTML email body
        html = f"""\
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #8B4513; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                        <h1 style="margin: 0;">The Mughal's Dastarkhwan</h1>
                        <p style="margin: 0; font-size: 14px;">Authentic Mughlai & Awadhi Cuisine</p>
                    </div>
                    
                    <h2>Your Reservation is Confirmed!</h2>
                    <p>Dear {guest_name},</p>
                    
                    <p>Thank you for reserving a table with us. Here are your reservation details:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #8B4513; margin: 20px 0;">
                        <p><strong>Reservation Date:</strong> {date}</p>
                        <p><strong>Reservation Time:</strong> {time}</p>
                        <p><strong>Party Size:</strong> {party_size} guest(s)</p>
                        <p><strong>Guest Name:</strong> {guest_name}</p>
                    </div>
                    
                    <p><strong>Important Notes:</strong></p>
                    <ul>
                        <li>Please arrive 5-10 minutes before your reservation time</li>
                        <li>If you need to cancel or modify your reservation, please contact us at least 2 hours in advance</li>
                        <li>We look forward to serving you authentic Mughlai cuisine!</li>
                    </ul>
                    
                    <p style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 12px;">
                        If you have any questions, please contact us directly.
                        <br><br>
                        Best regards,<br>
                        The Mughal's Dastarkhwan Team
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Attach HTML
        message.attach(MIMEText(html, "html"))
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, email, message.as_string())
        
        logger.info(f"Confirmation email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {e}")
        return False


def send_cancellation_email(guest_name: str, email: str, date: str, time: str):
    """Send reservation cancellation email"""
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Reservation Cancelled - The Mughal's Dastarkhwan"
        message["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        message["To"] = email
        
        # HTML email body
        html = f"""\
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #8B4513; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                        <h1 style="margin: 0;">The Mughal's Dastarkhwan</h1>
                        <p style="margin: 0; font-size: 14px;">Authentic Mughlai & Awadhi Cuisine</p>
                    </div>
                    
                    <h2>Reservation Cancelled</h2>
                    <p>Dear {guest_name},</p>
                    
                    <p>Your reservation has been successfully cancelled.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #8B4513; margin: 20px 0;">
                        <p><strong>Previous Reservation Date:</strong> {date}</p>
                        <p><strong>Previous Reservation Time:</strong> {time}</p>
                    </div>
                    
                    <p>We hope to serve you again in the future. If you'd like to make a new reservation, please visit our website.</p>
                    
                    <p style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 12px;">
                        Best regards,<br>
                        The Mughal's Dastarkhwan Team
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Attach HTML
        message.attach(MIMEText(html, "html"))
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, email, message.as_string())
        
        logger.info(f"Cancellation email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send cancellation email: {e}")
        return False


def send_order_confirmation_email(customer_name: str, email: str, order_id: str, items: list, total_amount: int, order_type: str = "dine-in"):
    """Send order confirmation email"""
    try:
        items_html = "".join([f"<li>{item['name']} x{item.get('quantity', 1)}</li>" for item in items])
        
        message = MIMEMultipart("alternative")
        message["Subject"] = "Order Confirmation - The Mughal's Dastarkhwan"
        message["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        message["To"] = email
        
        html = f"""\
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #8B4513; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                        <h1 style="margin: 0;">The Mughal's Dastarkhwan</h1>
                    </div>
                    
                    <h2>Your Order is Confirmed!</h2>
                    <p>Dear {customer_name},</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #8B4513; margin: 20px 0;">
                        <p><strong>Order ID:</strong> {order_id}</p>
                        <p><strong>Order Type:</strong> {order_type.title()}</p>
                    </div>
                    
                    <h3>Items:</h3>
                    <ul style="padding-left: 20px;">
                        {items_html}
                    </ul>
                    
                    <p><strong>Total Amount:</strong> ₹{total_amount}</p>
                    
                    <p>You earned <strong>{total_amount // 10} loyalty points</strong> on this order!</p>
                    
                    <p style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 12px;">
                        Thank you for your order!<br>
                        The Mughal's Dastarkhwan Team
                    </p>
                </div>
            </body>
        </html>
        """
        
        message.attach(MIMEText(html, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, email, message.as_string())
        
        logger.info(f"Order confirmation email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send order confirmation email: {e}")
        return False


def send_reservation_reminder_email(guest_name: str, email: str, date: str, time: str):
    """Send reservation reminder email (1 day before)"""
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = "Reminder: Your Table Reservation Tomorrow - The Mughal's Dastarkhwan"
        message["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        message["To"] = email
        
        html = f"""\
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #8B4513; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                        <h1 style="margin: 0;">The Mughal's Dastarkhwan</h1>
                    </div>
                    
                    <h2>Reminder: Your Reservation Tomorrow!</h2>
                    <p>Dear {guest_name},</p>
                    
                    <p>This is a friendly reminder about your upcoming reservation:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #8B4513; margin: 20px 0;">
                        <p><strong>Date:</strong> {date}</p>
                        <p><strong>Time:</strong> {time}</p>
                    </div>
                    
                    <p>We look forward to serving you authentic Mughlai cuisine!</p>
                    
                    <p style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 12px;">
                        Best regards,<br>
                        The Mughal's Dastarkhwan Team
                    </p>
                </div>
            </body>
        </html>
        """
        
        message.attach(MIMEText(html, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, email, message.as_string())
        
        logger.info(f"Reminder email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send reminder email: {e}")
        return False


def send_promotional_email(customer_name: str, email: str, promo_title: str, promo_content: str, offer_code: str = None):
    """Send promotional/marketing email"""
    try:
        offer_section = f"<p><strong>Promo Code:</strong> {offer_code}</p>" if offer_code else ""
        
        message = MIMEMultipart("alternative")
        message["Subject"] = f"{promo_title} - The Mughal's Dastarkhwan"
        message["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        message["To"] = email
        
        html = f"""\
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #8B4513; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                        <h1 style="margin: 0;">The Mughal's Dastarkhwan</h1>
                    </div>
                    
                    <h2>{promo_title}</h2>
                    <p>Dear {customer_name},</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #8B4513; margin: 20px 0;">
                        {promo_content}
                        {offer_section}
                    </div>
                    
                    <p>Visit us now to avail this exclusive offer!</p>
                    
                    <p style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 12px;">
                        Best regards,<br>
                        The Mughal's Dastarkhwan Team
                    </p>
                </div>
            </body>
        </html>
        """
        
        message.attach(MIMEText(html, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, email, message.as_string())
        
        logger.info(f"Promotional email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send promotional email: {e}")
        return False
