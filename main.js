// Import required modules
import express from 'express'; 
import cors from 'cors'; 
import morgan from 'morgan';  
import {client} from "./redis.js";
import cron from "node-cron";
import dayjs from 'dayjs';
import { doit} from "./getdata.js"
import { doitigr} from "./getdata_igr.js"
import { nanoid } from 'nanoid';
import fs from "fs";

import AdmZip from 'adm-zip';

import { fileURLToPath } from 'url';
import { dirname } from 'path'; 
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import Papa from 'papaparse';

// Create Express app
const app = express();

const port = 8053;

app.use(cors()); 

app.use(
  express.urlencoded({
    limit: '50mb', 
    extended: true,
  }),
);
app.use(express.json({limit: '50mb'}));

app.use(morgan('tiny'));

app.use(express.static('public'))

function deleteFilesInDirectory(directoryPath) {
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(directoryPath, file);

            fs.unlink(filePath, err => {
                if (err) {
                    console.error('Error deleting file:', err);
                } else {
                    console.log('Deleted file:', filePath);
                }
            });
        });
    });
}


function zipFolder(folderPath, zipFilePath) {
    const zip = new AdmZip();
  
    // Read the contents of the folder
    const files = fs.readdirSync(folderPath);
  
    // Add each file to the zip archive
    files.forEach(file => {
        const filePath = `${folderPath}/${file}`;
        if (fs.statSync(filePath).isDirectory()) {
            // If it's a directory, recursively zip its contents
            zipFolder(filePath, `${zipFilePath}/${file}.zip`);
        } else {
            // If it's a file, add it to the zip archive
            zip.addLocalFile(filePath);
        }
    });
  
    // Write the zip file to disk
    zip.writeZip(zipFilePath);
  }

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'job.html'));
});

app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

app.get('/igr', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'job_igr.html'));
});
app.get('/report-igr', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'report_igr.html'));
});

app.post('/proses', async(req, res) => {
    try {

        await deleteFilesInDirectory("./filewt")

        const h = await client.keys("download-wt|*")
        
        h.forEach(async(r) => await client.del(r))

        const h2 = await client.keys("res-download-wt|*")
        
        h2.forEach(async(r) => await client.del(r))

        const dataPayload = req.body.listtoko
        const listtoko = dataPayload.split("#")
        
        for(let u of listtoko){ 

           const pay = {
            kdcab: u.split("|")[0],
            toko: u.split("|")[1],
            tanggal: u.split("|")[2],
            rtype: u.split("|")[3],
            docno: u.split("|")[4],
            status: "NOK",
            updtime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
           }
           await client.set(`download-wt|${ u.split("|")[0]}|${u.split("|")[1]}|${u.split("|")[2]}`, JSON.stringify(pay),  {EX: 60 * 30 * 1})
        }
        
        res.json({
            message: "ok",
            status: "success"
        });

    } catch (error) {
        console.log(error)
        res.status(400).send({ code : 400, status: 'Error', message: error.message });
    }
   
}); 

app.post('/proses-igr', async(req, res) => {
    try {

        await deleteFilesInDirectory("./filewt_igr")

        const h = await client.keys("download-wt-igr|*")
        
        h.forEach(async(r) => await client.del(r))

        const h2 = await client.keys("res-download-wt-igr|*")
        
        h2.forEach(async(r) => await client.del(r))

        const dataPayload = req.body.listtoko
        const listtoko = dataPayload.split("#")
        
        for(let u of listtoko){ 

           const pay = {
            kdcab: u.split("|")[0],
            toko: u.split("|")[1],
            invno: u.split("|")[2],
            status: "NOK",
            updtime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
           }
           await client.set(`download-wt-igr|${ u.split("|")[0]}|${u.split("|")[1]}|${u.split("|")[2]}`, JSON.stringify(pay),  {EX: 60 * 30 * 1})
        }
        
        res.json({
            message: "ok",
            status: "success"
        });

    } catch (error) {
        console.log(error)
        res.status(400).send({ code : 400, status: 'Error', message: error.message });
    }
   
}); 

app.post('/data', async(req, res) => {
    try {
        const data = await client.keys("download-wt|*")
        
        let dataResp = []

        for(let i of data){
            const x = await client.get(i)
            dataResp.push(JSON.parse(x))
        }
        
        res.json({
            message: "ok",
            status: "success",
            data: {
                total_data: dataResp.length,
                toko_sdh_proses: dataResp.filter(r => r.status ==="SUKSES").length,
                toko_blm_proses: dataResp.filter(r => r.status ==="NOK").length,
                toko_data_nok: dataResp.filter(r => r.status ==="TIDAK ADA DATA").length,
                toko_gagal: dataResp.filter(r => r.status ==="GAGAL").length,
                total_data: dataResp.length,
                data_detail: dataResp
            }
        });


    } catch (error) {
        console.log(error)
        res.status(400).send({ code : 400, status: 'Error', message: error.message });
    }
   
});

app.post('/data-igr', async(req, res) => {
    try {
        const data = await client.keys("download-wt-igr|*")
        
        let dataResp = []

        for(let i of data){
            const x = await client.get(i) 
            dataResp.push(JSON.parse(x)) 
        }
        
        const data2 = await client.keys("res-wt-igr-download-wt-igr|*")
        
        let dataResp2 = [];
        let sudah = {};

        for (let i of data2) {
            let x = JSON.parse(await client.get(i));
            console.log(i,x.length)

            if(x.length > 0){
                if (x[0].keterangan === "Sudah Terbentuk BPB") {
                    let u = `${x[0].kdcab}|${x[0].toko}|${dayjs(x[0].bukti_tgl).format("YYYY-MM-DD")}`;
                    sudah[u] = sudah[u] || []; // Inisialisasi jika belum ada
                    sudah[u].push(x[0].bukti_no); // Tambahkan invoice number
                }    
                dataResp2.push(x);
            }else{               
                    let xu =  {
                        kdcab: i.split("|")[1],
                        toko: i.split("|")[2],
                        invno: i.split("|")[3],
                        bukti_tgl: 0,
                        bukti_no: 0,
                        gross: 0,
                        gross_npb_d: 0,
                        qty: 0,
                        sj_qty: 0,
                        ppn: 0,
                        ppn_npb_d: 0,
                        keterangan: "Data Tidak Ditemukan",
                        addid: "",
                    }
                    dataResp2.push(xu)
            } 
        }

        let dataDownload = Object.entries(sudah).map(
            ([key, invnos]) => `${key}|BPB|${invnos.join(",")}`
        );
        

        res.json({
            message: "ok",
            status: "success",
            data: {
                total_data: dataResp.length,
                toko_sdh_proses: dataResp.filter(r => r.status ==="SUKSES").length,
                toko_blm_proses: dataResp.filter(r => r.status ==="NOK").length,
                toko_data_nok: dataResp.filter(r => r.status ==="TIDAK ADA DATA").length,
                toko_gagal: dataResp.filter(r => r.status ==="GAGAL").length,
                total_data: dataResp.length,
                data_detail: dataResp,
                data_detail_result: dataResp2.flat(),
                text_download: dataDownload.join("#")
            }
        });


    } catch (error) {
        console.log(error)
        res.status(400).send({ code : 400, status: 'Error', message: error.message });
    }
   
});

app.post('/download', async(req, res) => {
    try {
        const h = await client.keys("res-download-wt*")
       
        let opts = {
            quotes: false, //or array of booleans
            quoteChar: '',
            escapeChar: '',
            delimiter: "|",
            header: true,
            newline: "\r\n",
            skipEmptyLines: true, //other option is 'greedy', meaning skip delimiters, quotes, and whitespace.
            columns: null //or array of strings
        }
        for(let u of h){

            const dataWT = await client.get(u) 
            const dataQ = JSON.parse(dataWT)
            if (dataQ[0].hasOwnProperty('pesan')) {
                
                continue;
            }
            let tgl = u.split("|")[3]
            tgl = `${tgl.substring(5,7)}${tgl.substring(8,10)}`
            const kdtk = u.split("|")[2].toUpperCase()
            const namafile = `WT${tgl}${kdtk.substring(0,1)}.${kdtk.substring(1,4)}`
            let dataTulis = JSON.parse(dataWT);
            dataTulis = dataTulis.map( (r) =>{
                return {
                    RECID: r.RECID,
                    RTYPE: r.RTYPE,
                    DOCNO: r.DOCNO,
                    SEQNO: r.SEQNO,
                    DIV: r.DIV,
                    PRDCD: r.PRDCD,
                    QTY: r.QTY,
                    PRICE: r.PRICE,
                    GROSS: r.GROSS,
                    CTERM: r.CTERM,
                    DOCNO2: r.DOCNO2,
                    ISTYPE: r.ISTYPE,
                    INVNO: r.INVNO,
                    TOKO: r.TOKO,
                    DATE: r.DATE,
                    DATE2: r.DATE2,
                    KETERANGAN: r.KETERANGAN,
                    PTAG: r.PTAG,
                    CAT_COD: r.CAT_COD,
                    LOKASI: r.LOKASI,
                    TGL1: r.TGL1,
                    TGL2: r.TGL2,
                    PPN: r.PPN,
                    TOKO_1: r.TOKO_1,
                    DATE3: r.DATE3,
                    DOCNO3: r.DOCNO3,
                    SHOP: r.SHOP,
                    PRICE_IDM: r.PRICE_IDM,
                    PPNBM_IDM: r.PPNBM_IDM,
                    PPNRP_IDM: r.PPNRP_IDM,
                    LT: r.LT,
                    RAK: r.RAK,
                    BAR: r.BAR,
                    BKP: r.BKP,
                    SUB_BKP: r.SUB_BKP,
                    PLUMD: r.PLUMD,
                    GROSS_JUAL: r.GROSS_JUAL,
                    PRICE_JUAL: r.PRICE_JUAL,
                    KODE_SUPPLIER: r.KODE_SUPPLIER,
                    DISC05: r.DISC05,
                    RATE_PPN: r.RATE_PPN,
                    JAM: r.JAM,
                    FLAG_BO: r.FLAG_BO,
                }
            })
            const csv = Papa.unparse(dataTulis ,opts);
            
            fs.writeFileSync(`./filewt/${namafile}`, csv);

        }

        await zipFolder("./filewt", "./downloads/data.zip")      
        
        const filePath = './downloads/data.zip';

        fs.readFile(filePath, (err, data) => {
            if (err) {
                // Handle error
                console.error('Error reading file:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
    
            // Set response headers
            res.set('Content-Type', 'application/zip');
            res.set('Content-Disposition', 'attachment; filename=data.zip');
    
            // Send file data as response
            res.send(data);
        }); 
        
    } catch (error) {
        console.log(error)
        res.status(400).send({ code : 400, status: 'Error', message: error.message });
    }
   
}); 

let taskDownload = true
cron.schedule('*/1 * * * *', async() => { 
    if (taskDownload) { 
        taskDownload = false
            console.log("[START] Download WT Toko: " + dayjs().format("YYYY-MM-DD HH:mm:ss") )
            try {       
                if(parseInt(dayjs().format("H")) < 19 || parseInt(dayjs().format("H")) > 5 ){
                    const job = await doit(client)
                    console.log(job)
                    console.log("[END] Download WT Toko:: " + dayjs().format("YYYY-MM-DD HH:mm:ss") )
                }else{
                    console.log("[SKIP] Download WT Toko:: " + dayjs().format("YYYY-MM-DD HH:mm:ss") )
                }
                taskDownload = true
        } catch (err) {
                console.log("[END] ERROR !!!  Download WT Toko:: " + dayjs().format("YYYY-MM-DD HH:mm:ss") )
                taskDownload = true
        }
    } 
});

let taskDownloadIgr = true;
cron.schedule('*/1 * * * *', async() => { 
//(async()=>{
    if (taskDownloadIgr) { 
        taskDownloadIgr = false
            console.log("[START] Download WT IGR Toko: " + dayjs().format("YYYY-MM-DD HH:mm:ss") )
            try {       
                if(parseInt(dayjs().format("H")) < 19 || parseInt(dayjs().format("H")) > 5 ){
                    await doitigr(client) 

                    console.log("[END] Download WT IGR Toko:: " + dayjs().format("YYYY-MM-DD HH:mm:ss") )
                }else{
                    console.log("[SKIP] Download WT IGR Toko:: " + dayjs().format("YYYY-MM-DD HH:mm:ss") )
                }
                taskDownloadIgr = true
        } catch (err) {
                console.log("[END] ERROR !!!  Download WT IGR Toko:: " + dayjs().format("YYYY-MM-DD HH:mm:ss") )
                taskDownloadIgr = true
        }
    } 
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://192.168.131.71:${port}`);
});
