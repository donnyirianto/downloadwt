let data = [
    {
        "pesan": "Access denied for user 'kasir'@'10.71.11.162' (using password: YES)"
    }
];

if (data[0].hasOwnProperty('pesan')) {
console.log("OK")
}else{
    console.log("BNok")
}