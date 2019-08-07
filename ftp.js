var chokidar=require("chokidar");
var fs=require("fs");
var ftpclient=require("ftp");
var mypath=require("path");

var scanDir = process.argv[2];
var ip = process.argv[3];


if(scanDir.indexOf(":") === -1||ip.indexOf(".")=== -1){
    console.log(scanDir);
    console.log(scanDir.indexOf(":"));
    console.log(ip);
    console.log(ip.indexOf("."));
    console.log("Usage: cmd SCANDIR FTPSEVER");
    return;
}

var watcher = chokidar.watch(scanDir, {
 ignored: /[\/\\]\./, persistent:true
});//配置监测目录路径
var client=new ftpclient();
var ftpReady=false;//服务器连接flag
var config = {host:ip,port:21,connTimeout:60000};//服务器连接配置
var currentPath = [];


//连接服务器
function connection(option) {
   client.connect(option);
};


function checkfileready(path) {
    var fd;
    try {
        fd=fs.openSync(path, 'r+');
        fs.closeSync(fd);
        stats=fs.statSync(path);
        console.log("File " + path +  ", size " +stats.size + " bytes is ready for uploading now...");
        ftpUpload(path);
    } catch(err) {
        console.log("not ready, fd = "+fd);
    }
};


function ftpUpload(path) {
        if (ftpReady == true) {
           console.log(path);
           var ext=mypath.extname(path);
                if (ext == ".dat") {
                    console.log("The file is in uploading process");
                    currentPath.push(path);
                    var name = mypath.basename(path,ext);
                    var d = new Date().getFullYear().toString() + (new Date().getMonth()+1).toString() + new Date().getDate().toString()
                    client.put(path,name +d+ ".dat", function(err) {
                        currentPath.forEach(function(item,index){
                            if(item === path){
                                currentPath.splice(index,1);
                            }
                        });
                        if (err) {
                            console.log ("ftp put failed. Error: "+err);
                             let data = path+"   "+err+"   "+new Date().toLocaleString()+"\r\n"
                            fs.appendFile('uploadfailed.txt',data, "utf8",(err) => {
                              if (err) throw err;
                              console.log('The uploadfailedfile has been saved!');
                            });          
                        }
                        else {
                            console.log("uploaded file " + path + " successfully");
                            let data = path+"  "+name +d+ ".dat   "+new Date().toLocaleString()+"\r\n"
                            fs.appendFile('uploadsuccess.txt',data, "utf8", (err) => {
                              if (err) throw err;
                              console.log('The uploadsuccessfile has been saved!');
                            });                        
                        }
                        //client.end();
                    });
                console.log("successfully???")
                }
                else{
                console.log("file " + path + " is invalid,NOT uploaded")
            };
            
        }
        else {
            console.log("ftp is not ready. File " + path + " NOT uploaded!");
            //connection(config);
        }

};

watcher
    .on('ready', () => { 
        console.log('Initial scan complete. Ready for changes.'); 
    })

    .on('add', (path) => {
        //stats=fs.statSync(path)
        console.log("added file " + path);
        checkfileready(path);
 
    })

    .on('change', function(path) { 
            //stats = fs.statSync(path);   
            //console.log(err);
            //console.log(stats);
            console.log("changed file " + path);
            checkfileready(path);
    })

  .on('unlink', function(path) { console.log('File', path, 'has been removed'); })
  .on('unlinkDir', function(path) { console.log('Directory', path, 'has been removed'); })
  .on('error', function(error) { console.log('Error happened', error); })
  .on('raw', function(event, path, details) { 
    //console.log('Raw event info:', event, path, details); 
});


client
    .on('ready', function(){
        console.log("FTP connection ready");
        console.log(currentPath);
        ftpReady=true;
    })
    .on('greeting', function(msg){console.log("FTP greeting event is "+msg);})
    .on('close', function(hadErr){console.log("FTP close event is "+hadErr)
        ftpReady=false;
        client.end();
        connection(config);    
    })   
    .on('error', function(err){console.log("FTP error event is "+err);
    ftpReady=false;
    }) 
    .on('end', function(){console.log("FTP end event");
    ftpReady=false;
    });  


connection(config);

process.argv.forEach(function(val,index,array){
    console.log(index+":"+val);
});