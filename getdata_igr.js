import { readRespSqlIgr, LoginESS} from "./readresp.js";
import dayjs from "dayjs";


const prepareData = async (client, r) => {
  try {
    let dataCache = await client.get(r);

    if (!dataCache) throw new Error("Data not found");
    
    dataCache = JSON.parse(dataCache)

    if(dataCache.status === "SUKSES") throw new Error("Skip"); 
        let querySQL = `select *,'${dataCache.kdcab}' as kdcab,'${dataCache.toko}' as toko, 
                        if(invno is null,'Toko Belum Proses','Sudah Terbentuk BPB') keterangan from 
                        (
                            SELECT 
                            docno,
                            recid,sum(sj_qty) sj_qty,
                            sum(gross) gross_npb_d,
                            sum(ppnrp)ppn_npb_d,
                            addid,addtime 
                            FROM npb_d 
                            WHERE docno = '${dataCache.invno}'
                            GROUP BY docno
                        ) a
                        left join
                        (
                            SELECT invno,bukti_no,cast(bukti_tgl as char) as bukti_tgl,sum(qty) qty,sum(gross) gross,sum(ppn) ppn 
                            FROM mstran 
                            WHERE 
                            rtype='BPB' 
                            AND invno = '${dataCache.invno}'
                            GROUP BY invno
                        ) b
                        on a.docno=b.invno`
        
        const dataPayload = {
          kdcab: dataCache.kdcab,
          toko: dataCache.toko,
          task: "SQL",
          idreport: `download-wt-igr|${dataCache.kdcab}|${dataCache.toko}|${dataCache.invno}`,
          station: "01",
          command: querySQL,
        };
        
    return {
      status: "Sukses",
      id: r,
      data: dataPayload, 
    };

  } catch (error) {
    return { status: "Gagal" };
  }
}; 

export const doitigr = async (client) => {
  try {

    console.log(`Running At IGR: ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`);

    let dataPending = await client.keys("download-wt-igr|*");
    
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
      
      console.log("Sukses ambil antrian", dataPayload.length)
      if (dataPayload.length == 0) {
        continue;
      }
      
      if (dataPayload.length >= 40) {
        let allPromise = [
          readRespSqlIgr(client, dataLogin.data, dataPayload.slice(0, 20)),
          readRespSqlIgr(client, dataLogin.data, dataPayload.slice(20, 40)),
          readRespSqlIgr(client, dataLogin.data, dataPayload.slice(40, 60)),
          readRespSqlIgr(client, dataLogin.data, dataPayload.slice(60, 80)),
          readRespSqlIgr(client, dataLogin.data, dataPayload.slice(80, 100)),
        ];
        await Promise.allSettled(allPromise);
      } else {        
        await readRespSqlIgr(client, dataLogin.data, dataPayload);
      }

      //await runningAllSave();

      console.log(`[collect] Total Task IGR: Looping request ${i}-${Math.min(i + 100, dataPending.length)}`);
    }
     
    return "Selesai"

  } catch (err) {
    console.log("Sini Ketnya : " + err);
    return "error";
  }
};