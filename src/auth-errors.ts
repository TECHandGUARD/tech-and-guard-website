export function authErrorMessage(error: {code?:string;status?:number}, action:'signup'|'reset'|'password'|'login'){
 const code=error.code;
 if(error.status===0)return 'The account service could not be reached or timed out. Check your connection and try again.';
 if(code==='email_address_not_authorized'||code==='email_address_not_allowed')return 'Account email delivery is unavailable. Please contact aneleq@techandguard.co.za; repeated attempts will not fix the sender configuration.';
 if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||error.status===429)return 'Too many attempts. Please wait before trying again.';
 if(code==='signup_disabled')return 'Account registration is currently disabled. Please contact the administrator.';
 if(code==='weak_password')return 'Choose a stronger password with at least 12 characters.';
 if(code==='email_not_confirmed')return 'Verify your email before signing in. Check your inbox and spam folder.';
 if(code==='captcha_failed')return 'Account verification could not be completed. Please contact the administrator.';
 if(action==='login')return 'Sign-in failed. Check your email and password.';
 if(action==='password')return 'Password update failed. Request a fresh recovery link or sign in again.';
 return action==='signup'?'Registration could not be completed. Please contact the administrator.':'Recovery could not be completed. Please contact the administrator.';
}
