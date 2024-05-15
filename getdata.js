import { readRespSql} from "./readresp.js";
import dayjs from "dayjs";


const prepare = async (client, r) => {
  try {
    let dataCache = await client.get(r);

    if (!dataCache) throw new Error("Data not found");
    
    dataCache = JSON.parse(dataCache)

    if(dataCache.status === "SUKSES") throw new Error("Skip");

    return {
      status: "Sukses",
      id: r,
      data: dataCache
    };
  } catch (error) {
    return { status: "Gagal" };
  }
}; 

export const doit = async (client) => {
  try {

    console.log(`Running At : ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`);

    let rx = await client.keys("download-wt-*");
    
    if(!rx) return "Tidak Ada Jadwal"
    
    let allPrepare = [];
    for (let i of rx) {
      const promise = new Promise((res, rej) => {
        prepare(client, i)
          .then((val) => {
            res(val);
          })
          .catch((e) => {
            rej(e);
          });
      });
      allPrepare.push(promise);
    }
    
    let actTaskPrepare = await Promise.allSettled(allPrepare);

    let exPrepare = actTaskPrepare.filter((e) => e.status === "fulfilled").map((r) => r.value); 
    let listHrAct = exPrepare.filter((r) => r.status == "Sukses");
    
    const dataGagalAll = [];
    
    for (let i = 0; i < listHrAct.length; i += 50) {
      console.info(`[collect] run ${i}-${Math.min(i + 50, listHrAct.length)}`);
      let allPromise = [];

      for (let j = i; j < Math.min(i + 50, listHrAct.length); j++) {
        const promise = new Promise((res, rej) => {
          readRespSql(client, listHrAct[j].id,listHrAct[j].data)
            .then((val) => {
              res(val);
            })
            .catch((e) => {
              rej(e);
            });
        });
        allPromise.push(promise);
      }
        

      let actTask = await Promise.allSettled(allPromise);
      
      actTask = actTask.filter((e) => e.status === "fulfilled").map((r) => r.value);
      let dataResult_sukses = actTask.filter((r) => r.status == "Sukses");
      let dataResult_gagal = actTask.filter((r) => r.status != "Sukses");
      
      dataGagalAll.push(...dataResult_gagal);

      console.info(
        `Total Task: Looping request ${i}-${Math.min(i + 50, listHrAct.length)}, Total OK: ${
          dataResult_sukses.length
        }, Total NOK: ${dataGagalAll.length}`
      );
    }

    return "Selesai"

  } catch (err) {
    console.log("Sini Ketnya : " + err);
    return "error";
  }
};