export async function checkAdminAccess(request:(path:string,options:RequestInit)=>Promise<unknown>){
 const options={method:'POST',body:'{}'};
 const allowed=await request('/rest/v1/rpc/corporate_is_admin',options);
 if(allowed!==true)throw new Error('You are signed in, but this account does not have store administrator access.');
 const role=await request('/rest/v1/rpc/corporate_staff_role',options);
 return {owner:role==='owner'};
}
