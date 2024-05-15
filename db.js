import axios from "axios";

export const query = async(queryx) => {
  try {
    const result = await axios.post('http://192.168.131.71:7272/api/v1/mysql/query', {query : queryx}, {timeout : 120000})     
    
    return result.data.data[0]
  } catch (error) {  
    console.log(error)
    throw error.message
  }
} 
