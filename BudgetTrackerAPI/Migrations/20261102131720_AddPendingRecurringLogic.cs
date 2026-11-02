using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BudgetTrackerAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingRecurringLogic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPending",
                table: "Expenses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastProcessedDate",
                table: "Expenses",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPending",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "LastProcessedDate",
                table: "Expenses");
        }
    }
}
