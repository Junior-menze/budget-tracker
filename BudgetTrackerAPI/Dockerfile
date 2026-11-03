# Use the official .NET 9 SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build-env
WORKDIR /app

# Copy the csproj file and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build the release
COPY . ./
RUN dotnet publish -c Release -o out

# Build the runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build-env /app/out .

# Expose the port Render will use
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

# Start the app
ENTRYPOINT ["dotnet", "BudgetTrackerAPI.dll"]