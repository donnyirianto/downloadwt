import axios from "axios";
import dayjs from "dayjs";
import {nanoid} from "nanoid";

export const readRespSql =  async(client,token,payload) => {
  try { 
    console.log("request")
    let respTask = await axios.post("http://172.24.52.10:7321/ReportFromListener/v1/CekStore", payload, {
        headers: {
          Token: `${token}`,
        },
        timeout: 200000,
      });
      console.log("respData",respTask.data)
      if (respTask.data.code != 200) {
        throw new Error("Response Code Api != 200");
      }
  
      let readResponse = JSON.parse(respTask.data.data);
      
      readResponse = readResponse.filter((r) => r.data != "");
  
      for (let i of readResponse) {
        if (i.msg == "Succes SQL Native") {
            
            await client.set(`res-${i.idreport}`, i.data, {EX: 60 * 60 * 1});
        }else{
            
            await client.set(`res-${i.idreport}`, JSON.parse(i.data)[0], {EX: 60 * 60 * 1});
        }
        let iChace = await client.get(i.idreport)
        iChace = JSON.parse(iChace)
        const upd = {
            "kdcab" : iChace.kdcab,
            "toko": iChace.toko,
            "tanggal": iChace.tanggal,
            "rtype": iChace.rtype,
            "docno": iChace.docno,
            "status": "SUKSES",
            "updtime": dayjs().format("YYYY-MM-DD HH:mm:ss")
        }
     
        await client.set(i.idreport,JSON.stringify(upd))
      }
    
        return {
            code : 200,
            status : "Sukses"
        }
   } catch(err) {  
        console.log(err)
        return {
            code : 400,
            status : "Gagal",
            data: "Error - Response Api",
            err: err
        }
  } 
  
}
export const LoginESS = async () => {
    try {
      const payload = {
        username: "2012073403",
        password: "N3wbi330m3D@2406",
      };
      let resp = await axios.post("http://172.24.52.30:7321/login", payload, { timeout: parseInt(20000) });
  
      if (resp.data.code != 200) {
        throw new Error("Response Code Api != 200");
      }
  
      let dataRes = JSON.parse(resp.data.data);
  
      return {
        code: 200,
        status: "Sukses",
        data: dataRes.token,
      };
    } catch (err) {
      return {
        code: 400,
        status: "Gagal",
        data: "Error - Response Api",
        err: err,
      };
    }
  };