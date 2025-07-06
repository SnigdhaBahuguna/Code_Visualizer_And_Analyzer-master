int fact(int n){
    if(n==1 || n==0)
     return 1;
    return fact(n-1)+fact(n-2);
}