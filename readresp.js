import axios from "axios";
import dayjs from "dayjs";
import {nanoid} from "nanoid";

export const readRespSql =  async(client,id,r) => {
  try {
        let query = `SELECT IFNULL(A.RECID,'') AS RECID,LEFT(A.RTYPE,1) AS RTYPE,
                A.BUKTI_NO AS DOCNO,A.SEQNO,if(length(B.CAT_COD)=6,MID(B.CAT_COD,3,2),MID(B.CAT_COD,2,2)) AS \`DIV\`,
                A.PRDCD,A.QTY,A.PRICE,A.GROSS,CR_TERM AS CTERM,A.INVNO AS DOCNO2,A.ISTYPE,
                A.PO_NO AS INVNO,
                IF((RTYPE='BPB' AND ISTYPE='') OR RTYPE IN ('I','O') OR (RTYPE='K' AND ISTYPE<>'L'),
                GUDANG,
                IF((RTYPE='BPB' AND ISTYPE<>'') OR (RTYPE='K' AND ISTYPE='L'),A.SUPCO,IF(RTYPE='X' AND (ISTYPE='' OR ISTYPE IN ('BM','KO')),(SELECT TOKO FROM TOKO),IF(RTYPE='X' AND (ISTYPE LIKE '%BA%' OR ISTYPE LIKE '%SO%') AND A.SUPCO='',(SELECT TOKO FROM TOKO),IF(RTYPE='X' AND (ISTYPE LIKE '%BA%' OR ISTYPE LIKE '%SO%') AND A.SUPCO<>'',A.SUPCO,'XXX'))))) AS TOKO,DATE_FORMAT(A.BUKTI_TGL,'%y%m%d') AS \`DATE\`,'0' AS DATE2,A.KETER AS KETERANGAN,B.PTAG,B.CAT_COD,'01' AS LOKASI,DATE_FORMAT(A.BUKTI_TGL,'%d-%m-%Y') AS TGL1,DATE_FORMAT(A.INV_DATE,'%d-%m-%Y') AS TGL2,A.PPN,'' AS TOKO_1,'' AS DATE3,'' AS DOCNO3,(SELECT KDTK FROM TOKO) AS SHOP,A.PRICE_IDM,'0' AS PPNBM_IDM,A.PPN_RP_IDM AS PPNRP_IDM,IFNULL(A.LT,'') AS LT,IFNULL(A.RAK,'') AS RAK,IFNULL(A.BAR,'') AS BAR,IF(A.BKP="Y",'T','F') AS BKP,IFNULL(A.SUB_BKP,' ') AS SUB_BKP,A.PRDCD AS PLUMD,A.GROSS_JUAL,A.PRICE_JUAL,IFNULL(C.KODE_SUPPLIER,'') AS KODE_SUPPLIER,A.DISC_05 AS DISC05,ifnull(ppn_rate,0) RATE_PPN,time(bukti_tgl) JAM,
                if(b.flagprod rlike 'POT=Y','POT','') FLAG_BO
        FROM MSTRAN A LEFT JOIN PRODMAST B ON A.PRDCD=B.PRDCD
        LEFT JOIN SUPMAST C ON A.SUPCO=C.SUPCO
        WHERE DATE(BUKTI_TGL)='${r.tanggal}' and rtype='${r.rtype}' and bukti_no in(${r.docno}) AND istype not in ('GGC','RMB')`
        
        const payload = [{
            kdcab:"",
            toko: r.toko,
            id: dayjs().format("YYYYMMDDHHmmss"),
            task: "SQL",
            idtask : "downloadwt",
            taskdesc: "downloadwt",
            timeout: 60,
            isinduk: true,
            station: "01",
            command: query
        }] 

        let resp = await axios.post("http://172.24.52.10:2905/CekStore",payload, {timeout : parseInt(20000)});
        
        if(resp.data.code != 200 ){ 
            throw new Error("Response Code Api != 200");
        }
        let dataRes = JSON.parse(resp.data.data)

        if(dataRes[0].msg != 'success' && dataRes[0].msg !='succes'){
            throw new Error('error pembacaan message');
        } 

        let dataReponse = JSON.parse(dataRes[0].data)
        
        dataReponse= JSON.parse(dataReponse[0])
        
        if (dataReponse.hasOwnProperty('error') || dataReponse[0].hasOwnProperty('pesan')){
            const upd = {
                "toko": r.toko,
                "tanggal": r.tanggal,
                "rtype": r.rtype,
                "docno": r.docno,
                "status": "TIDAK ADA DATA",
                "updtime": dayjs().format("YYYY-MM-DD HH-mm-ss")
            }
            await client.set(id,JSON.stringify(upd))
            return {
                code : 400,
                status : "Gagal",
                data: "Error - Response Api",
                err: "Data Tidak Ada"
            }
        }
        
        await client.set(`res-download-wt-${r.toko}-${dayjs(r.tanggal).format("YYMMDD")}`, JSON.stringify(dataReponse), {EX: 60 * 60 * 1});

        const upd = {
                "toko": r.toko,
                "tanggal": r.tanggal,
                "rtype": r.rtype,
                "docno": r.docno,
                "status": "SUKSES",
                "updtime": dayjs().format("YYYY-MM-DD HH-mm-ss")
        }

        await client.set(id,JSON.stringify(upd))
                
        return {
            code : 200,
            status : "Sukses"
        }
   } catch(err) {
        const upd = {
            "toko": r.toko,
            "tanggal": r.tanggal,
            "rtype": r.rtype,
            "docno": r.docno,
            "status": "GAGAL",
            "updtime": dayjs().format("YYYY-MM-DD HH-mm-ss")
        }

        await client.set(id,JSON.stringify(upd))
        return {
            code : 400,
            status : "Gagal",
            data: "Error - Response Api",
            err: err
        }
  } 
  
}
