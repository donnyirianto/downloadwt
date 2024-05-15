
import * as mysql from 'mysql2/promise';

export const queryAny = async (host,user,password,database,port,queryx) => {
  try {
    const dbnya = { 
      host: host,
      user: user,
      password: password,
      database: database,
      port: port,
      dateStrings:true,
      multipleStatements: true
    }

    const conn =  await mysql.createConnection(dbnya); 

    const [result] = await conn.query(queryx)
    conn.end()
    return {
      status: "Sukses",
      data: result
    }

  }catch(e){
    return {
      status: "Gagal",
    }
  }  
} 
  