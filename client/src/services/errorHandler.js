export function errorHandler(error){


    if(error.response){


        return {


            status:
            error.response.status,


            message:
            error.response.data?.message
            ||
            "حدث خطأ في السيرفر"



        };


    }




    if(error.request){


        return {


            message:
            "لا يوجد اتصال بالسيرفر"


        };


    }




    return {


        message:
        error.message
        ||
        "حدث خطأ غير معروف"


    };


}
