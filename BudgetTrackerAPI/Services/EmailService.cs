using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Configuration;

namespace BudgetTrackerAPI.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            var email = new MimeMessage();
            email.From.Add(new MailboxAddress(_config["Mailtrap:FromName"], _config["Mailtrap:FromEmail"]));
            email.To.Add(MailboxAddress.Parse(toEmail));
            email.Subject = subject;

            var builder = new BodyBuilder { HtmlBody = htmlBody};
            email.Body = builder.ToMessageBody();

            using var smtp = new SmtpClient();

            await smtp.ConnectAsync(_config["Mailtrap:Host"], int.Parse(_config["mailtrap:Port"]!), SecureSocketOptions.StartTls);

            await smtp.AuthenticateAsync(_config["Mailtrap:Username"], _config["Mailtrap:Password"]);

            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
            await Task.Delay(1000);
        }
    }
}