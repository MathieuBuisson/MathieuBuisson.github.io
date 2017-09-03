---
title: "Using Selenium and Pester for PowerShell-based web testing"
tags: [Pester, PowerShell, Web]
---

Setup :

Install the Selenium WebDriver library.
It is the package named "Selenium.WebDriver" on NuGet.org so you can install it using the Nuget Package Manager console in Visual Studio.
If you don't want to mess with the Nuget Package Manager console (I hear you) you can download the package from :
https://www.nuget.org/api/v2/package/Selenium.WebDriver/3.4.0.
Change the .nupkg file extension to .zip and unzip it.
Copy the subfolder named lib to a location of your choice (preferably a location in you PATH environment variable).

Next, install the driver for the web browser of your choice.
Chocolatey is a great way to check (and install) the drivers available for different drivers :
https://chocolatey.org/packages?q=selenium

In this case we are going to use the Chrome driver : https://chocolatey.org/packages/selenium-chrome-driver .  
However you install the WebDriver, make a note of the location of the driver executable (chromedriver.exe, in the case of the Chrome driver).  
Ensure this location is in your PATH environment variable.

Now, we are ready to play with Selenium WebDriver.

  - Load the Selenium .Net library
Add-Type -Path 'C:\tools\selenium\lib\net40\WebDriver.dll'

  - Start the Chrome instance that will be drived by Selenium
$Driver = New-Object OpenQA.Selenium.Chrome.ChromeDriver

  - The new Chrome browser windows is not maximized by default, you may want to maximize it
$Driver.Manage().Window.Maximize()

  - Open the URL of the web page to test (in this case, this is a local HTML file)
$Driver.Navigate().GoToUrl('file:///C:/GitHub/PSCodeHealth/Examples/HtmlReport.html')

https://gist.github.com/MathieuBuisson/4958c03be46e05f6ce8f3ef4ce6b3b51
