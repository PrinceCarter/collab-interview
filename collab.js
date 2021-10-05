const fs = require("fs");
const csv = require("csvtojson");
const files = ["file1.csv", "file2.csv"];

// List of files and their Accounts to be compared
var fileList = [];

// List of emails with discrepancies
var discrepancies = [];

/* 
  Optional concern (Fill in with concern (subscriber_count or channel_ownership) 
  to find only output the discrepancies which are related to that data)
  Leave as "" to get all discrepancies 
*/
var concern = ""; 

// Account class to store csv lines
class Account {
  constructor(email, channel, sub_count) {
    this.email = email;
    this.channel_id = channel;
    this.sub_count = sub_count;
  }
}

// Read data from the csv files and store them as an array of Account objects
function processFiles() {
  for (var i = 0; i < files.length; i++) {
    csv()
      .fromFile(files[i])
      .then((jsonObj) => {
        // An array of all Accounts object for each file
        var array = new Array();
        var accounts = JSON.parse(JSON.stringify(jsonObj));
        for (var x in accounts) {
          // Get and format channel id correctly
          var channel = formatChannelID(accounts[x]["YouTube Channel"]);
          // Get and format sub count correctly
          var sub_count = formatSubCount(accounts[x]["Subscriber Count"]);
          // Create and store new Account object
          const account = new Account(
            accounts[x]["Account Email"],
            channel,
            sub_count
          );
          array.push(account);
        }
        fileList.push(array);
      });
  }
}

// Format channel id to remove youtube portion, "UC", "-", and "_"
function formatChannelID(channel) {
  channel = channel.substring(channel.lastIndexOf("/") + 1);
  channel = channel.replace(/[_-]/g, "");
  if (channel.substring(0, 2) == "UC") {
    channel = channel.substring(2);
  }
  return channel;
}

// Format sub count correctly by removing ","
function formatSubCount(subs) {
  subs = subs.replace(",", "");
  return parseInt(subs);
}

/* 
  Since reading csv is asynchronous, we constantly check if we've processed
  all of the files so we can continue with finding errors. 
*/
var timeout = setInterval(function () {
  if (checkIfFinished()) {
    clearInterval(timeout);
    findErrors(fileList, concern);
  }
}, 100);

// Files are finished processing once our filelist length equals our input files array length
function checkIfFinished() {
  return fileList.length == files.length;
}

// Once we've finally processed all of the files, we can now compare them
function findErrors(arrayOfFiles, userConcern) {
  /* 
    Since we can't assume all files are have the same number of lines,
    we find the file with the shortest length and compare to rest using this length 
  */
  var min = arrayOfFiles.reduce((prev, next) =>
    prev.length > next.length ? next : prev
  ).length;
  var accountToCompare;
  var account;
  if (userConcern == "subscriber_count") {
    for (var i = 0; i < min; i++) {
      // To make things simple, we just compare all files to the first file
      accountToCompare = arrayOfFiles[0][i];
      for (var j = 1; j < arrayOfFiles.length; j++) {
        account = arrayOfFiles[j][i];
        if (accountToCompare.sub_count != account.sub_count) {
          discrepancies.push(accountToCompare.email);
        }
      }
      /* 
        If this file length is greater than the minimum file length,
        I would assume that we add the rest of the emails in the greater file
        Since we would be comparing an Account to a null Account 
      */
      if (arrayOfFiles[j].length > min) {
        for (var k = arrayOfFiles[j].length - min; k < arrayOfFiles[j].length;k++) {
          discrepancies.push(arrayOfFiles[j][k].email);
        }
      }
    }
  } else if (userConcern == "channel_ownership") {
    for (i = 0; i < min; i++) {
      // To make things simple, we just compare all files to the first file
      accountToCompare = arrayOfFiles[0][i];
      for (j = 1; j < arrayOfFiles.length; j++) {
        account = arrayOfFiles[j][i];
        if (accountToCompare.channel_id != account.channel_id) {
          discrepancies.push(accountToCompare.email);
        }
        if (arrayOfFiles[j].length > min) {
          for (var k = arrayOfFiles[j].length - min; k < arrayOfFiles[j].length;k++) {
            discrepancies.push(arrayOfFiles[j][k].email);
          }
        }
      }
    }
  } else {
    for (i = 0; i < min; i++) {
      // To make things simple, we just compare all files to the first file
      accountToCompare = arrayOfFiles[0][i];
      for (j = 1; j < arrayOfFiles.length; j++) {
        account = arrayOfFiles[j][i];
        if (
          accountToCompare.email != account.email ||
          accountToCompare.channel_id != account.channel_id ||
          accountToCompare.sub_count != account.sub_count
        ) {
          discrepancies.push(accountToCompare.email);
        }
      }
      if (arrayOfFiles[j].length > min) {
        for (var k = arrayOfFiles[j].length - min; k < arrayOfFiles[j].length; k++) {
          discrepancies.push(arrayOfFiles[j][k].email);
        }
      }
    }
  }
  console.log(discrepancies);
}

processFiles();
