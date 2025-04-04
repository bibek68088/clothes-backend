import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number.parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// Email templates
const templates = {
  orderConfirmation: (order: any) => ({
    subject: `Order Confirmation #${order.id.substring(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your order!</h2>
        <p>Your order has been received and is being processed.</p>
        <h3>Order Details</h3>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
        <p><strong>Total:</strong> $${order.total_amount.toFixed(2)}</p>
        <h3>Items</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Product</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Quantity</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (item: any) => `
              <tr>
                <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">
                  ${item.product.name}
                  ${item.selected_options?.color ? `<br><small>Color: ${item.selected_options.color}</small>` : ""}
                  ${item.selected_options?.size ? `<br><small>Size: ${item.selected_options.size}</small>` : ""}
                </td>
                <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${item.quantity}</td>
                <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">$${item.price.toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        <p>Thank you for shopping with us!</p>
      </div>
    `,
  }),

  orderStatusUpdate: (order: any) => ({
    subject: `Order Status Update #${order.id.substring(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Order Status Has Been Updated</h2>
        <p>Your order status has been updated to: <strong>${order.status}</strong></p>
        <h3>Order Details</h3>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
        <p><strong>Total:</strong> $${order.total_amount.toFixed(2)}</p>
        <p>Thank you for shopping with us!</p>
      </div>
    `,
  }),
}

// Send email
export const sendEmail = async (to: string, template: keyof typeof templates, data: any) => {
  try {
    const { subject, html } = templates[template](data)

    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@example.com",
      to,
      subject,
      html,
    }

    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error("Email sending error:", error)
    return false
  }
}

// Test email connection
export const testEmailConnection = async () => {
  try {
    await transporter.verify()
    console.log("Email service is ready")
    return true
  } catch (error) {
    console.error("Email service error:", error)
    return false
  }
}

