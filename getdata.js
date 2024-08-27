import { readRespSql, LoginESS} from "./readresp.js";
import dayjs from "dayjs";


const prepareData = async (client, r) => {
  try {
    let dataCache = await client.get(r);

    if (!dataCache) throw new Error("Data not found");
    
    dataCache = JSON.parse(dataCache)

    if(dataCache.status === "SUKSES") throw new Error("Skip");

    let filterRtype = dataCache.rtype === "%" ? "" : `and rtype='${dataCache.rtype}'`
    let filterDocno = dataCache.docno === "%" ? "" : `and bukti_no in(${dataCache.docno})`

        let querySQL = `SELECT IFNULL(A.RECID,'') AS RECID,LEFT(A.RTYPE,1) AS RTYPE,
                A.BUKTI_NO AS DOCNO,A.SEQNO,if(length(B.CAT_COD)=6,MID(B.CAT_COD,3,2),MID(B.CAT_COD,2,2)) AS \`DIV\`,
                A.PRDCD,A.QTY,A.PRICE,A.GROSS,CR_TERM AS CTERM,A.INVNO AS DOCNO2,A.ISTYPE,
                A.PO_NO AS INVNO,
                IF((RTYPE='BPB' AND ISTYPE='') OR RTYPE IN ('I','O') OR (RTYPE='K' AND ISTYPE<>'L'),
                GUDANG,
                IF((RTYPE='BPB' AND ISTYPE<>'') OR (RTYPE='K' AND ISTYPE='L'),A.SUPCO,IF(RTYPE='X' AND (ISTYPE='' OR ISTYPE IN ('BM','KO')),(SELECT TOKO FROM TOKO),IF(RTYPE='X' AND (ISTYPE LIKE '%BA%' OR ISTYPE LIKE '%SO%') AND A.SUPCO='',(SELECT TOKO FROM TOKO),IF(RTYPE='X' AND (ISTYPE LIKE '%BA%' OR ISTYPE LIKE '%SO%') AND A.SUPCO<>'',A.SUPCO,'XXX'))))) AS TOKO,DATE_FORMAT(A.BUKTI_TGL,'%y%m%d') AS \`DATE\`,'0' AS DATE2,A.KETER AS KETERANGAN,B.PTAG,B.CAT_COD,'01' AS LOKASI,DATE_FORMAT(A.BUKTI_TGL,'%d-%m-%Y') AS TGL1,DATE_FORMAT(A.INV_DATE,'%d-%m-%Y') AS TGL2,A.PPN,'' AS TOKO_1,'' AS DATE3,'' AS DOCNO3,(SELECT KDTK FROM TOKO) AS SHOP,A.PRICE_IDM,'0' AS PPNBM_IDM,A.PPN_RP_IDM AS PPNRP_IDM,IFNULL(A.LT,'') AS LT,IFNULL(A.RAK,'') AS RAK,
                IFNULL(A.BAR,'') AS BAR,IF(A.BKP="Y",'T','F') AS BKP,IFNULL(A.SUB_BKP,' ') AS SUB_BKP,A.PRDCD AS PLUMD,A.GROSS_JUAL,A.PRICE_JUAL,IFNULL(C.KODE_SUPPLIER,'') AS KODE_SUPPLIER,A.DISC_05 AS DISC05,ifnull(ppn_rate,0) RATE_PPN,time(bukti_tgl) JAM,
                if(b.flagprod rlike 'POT=Y','POT','') FLAG_BO
        FROM MSTRAN A LEFT JOIN PRODMAST B ON A.PRDCD=B.PRDCD
        LEFT JOIN SUPMAST C ON A.SUPCO=C.SUPCO
        WHERE DATE(BUKTI_TGL)='${dataCache.tanggal}' 
        AND istype not in ('GGC','RMB')
        ${filterRtype}
        ${filterDocno};
        `
        
        const dataPayload = {
          kdcab: dataCache.kdcab,
          toko: dataCache.toko,
          task: "SQL",
          idreport: `download-wt|${dataCache.kdcab}|${dataCache.toko}|${dataCache.tanggal}`,
          station: "01",
          command: querySQL,
        };
        console.log(JSON.stringify(dataPayload))
    return {
      status: "Sukses",
      id: r,
      data: dataPayload, 
    };

  } catch (error) {
    return { status: "Gagal" };
  }
}; 

export const doit = async (client) => {
  try {

    console.log(`Running At : ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`);

    let dataPending = await client.keys("download-wt|*");
    
    if(!dataPending) return "Tidak Ada Jadwal"

    const dataLogin = await LoginESS();

    if (dataLogin.code != 200) throw new Error(dataLogin); 
    console.log("Total Pending: ",dataPending.length)
    for (let i = 0; i < dataPending.length; i += 100) {
      console.log(`[collect] run ${i}-${Math.min(i + 100, dataPending.length)}`);
      let allPromise = [];

      for (let j = i; j < Math.min(i + 100, dataPending.length); j++) {
        const promise = new Promise((res, rej) => {
          prepareData(client, dataPending[j])
            .then((val) => {
              res(val);
            })
            .catch((e) => {
              rej(e);
            });
        });

        allPromise.push(promise);
      }

      const dataCache = await Promise.allSettled(allPromise);

      let dataResult = dataCache.filter((r) => r.status === "fulfilled").map((r) => r.value);
      dataResult = dataResult.filter((r) => r.status === "Sukses");

      const dataPayload = dataResult.map((r) => r.data);
      
      console.log("Sukses ambil antrian",dataPayload.length)
      if (dataPayload.length == 0) {
        continue;
      }
      
      if (dataPayload.length >= 40) {
        let allPromise = [
          readRespSql(client, dataLogin.data, dataPayload.slice(0, 20)),
          readRespSql(client, dataLogin.data, dataPayload.slice(20, 40)),
          readRespSql(client, dataLogin.data, dataPayload.slice(40, 60)),
          readRespSql(client, dataLogin.data, dataPayload.slice(60, 80)),
          readRespSql(client, dataLogin.data, dataPayload.slice(80, 100)),
        ];
        await Promise.allSettled(allPromise);
      } else {
        
        await readRespSql(client, dataLogin.data, dataPayload);
      }

      //await runningAllSave();

      console.log(`[collect] Total Task: Looping request ${i}-${Math.min(i + 100, dataPending.length)}`);
    }
     
    return "Selesai"

  } catch (err) {
    console.log("Sini Ketnya : " + err);
    return "error";
  }
};