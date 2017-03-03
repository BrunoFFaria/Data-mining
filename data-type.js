/**
 * Created by Bruno Faria on 09/08/2016.
 */

/* declare default data.table methods */
var data_table = function(){

    /* populate data structure */
    this.data = [];                      // stored in column format each array has all the row values
    this.field_names = [];
    this.field_translation = [];
    this.field_isFactor = [];
    this.num_fields  = 0;
    this.num_rows = 0;
    this.error = "";
    
    /* populate methods */
    this.get_orig_row  = function (row_number) {
        var result = [];
        var i = 0;
        /* check if row exists in array */
        if (row_number >= this.num_rows) {
            return result;
        }

        result = this.get_row(row_number);

        /* for each field */
        for (i = 0; i < this.num_fields; i++) {
            /* is this field a factor? */
            if (this.field_isFactor[i] == true) {    // true implies factor
                /* translate numeric symbol to factor */
                result[i] = this.field_translation[i][result[i]];
            }
        }
        return result;
    };

    this.get_orig_field = function(field_number){

        var result = [];

        /* check if row exists in array */
        if (field_number >= this.num_fields) {
            return result;
        }

        result = this.get_field(field_number);

        if (this.field_isFactor[field_number] == true) {
            for(var i = 0; i < result.length; i++){
                result[i] = this.field_translation[field_number][result[i]];
            }
        }
        return result;
    };
    this.get_orig_val_at = function(row_number, field_number){
        if(row_number > this.num_rows){
            return result;
        }

        if(field_number > this.num_fields){
            return result;
        }
        var val = this.get_val_at(row_number, field_number);
        if(this.field_isFactor[field_number] == true){
            val = this.field_translation[field_number][val];
        }
        return val;
    };
    this.get_row = function(row_number){
        var result = [];

        /* check if row exists in array */
        if (row_number >= this.num_rows) {
            return result;
        }

        /* for each field */
        for (var i = 0; i < this.num_fields; i++) {

            result.push(this.data[i][row_number]);
        }
        return result;
    };

    this.get_row_by_indexes = function(row_number, I){
        var result = [];

        /* check if row exists in array */
        if (row_number >= this.num_rows) {
            return result;
        }

        /* for each field */
        for (var i = 0; i < I.length; i++) {
            if(I[i] > this.num_fields){
                return [];
            }

            result.push(this.data[I[i]][row_number]);
        }
        return result;
    };

    this.get_field = function(field_number){
        var result = [];

        /* check if row exists in array */
        if (field_number >= this.num_fields) {
            return result;
        }

        /* for each field */
        for (var i = 0; i < this.num_rows; i++) {
            result.push(this.data[field_number][i]);
        }
        return result;
    };

    this.get_field_by_indexes = function(field_number, I){
        var result = [];

        /* check if row exists in array */
        if (field_number >= this.num_fields) {
            return result;
        }
        /* for each field */
        for (var i = 0; i < I.length; i++) {
            if(I[i]>this.num_rows){
                return [];
            }

            result.push(this.data[field_number][I[i]]);
        }
        return result;
    };

    this.get_val_at = function(row_number, field_number){
        var result = [];
        if(row_number > this.num_rows){
            return result;
        }

        if(field_number > this.num_fields){
            return result;
        }

        return this.data[field_number][row_number];
    };

    this.remove_row = function(row){
        for(var i = 0; i < this.num_fields; i++){
            this.data[i].splice(row,1);
        }
        this.num_rows--;
    };

    this.remove_field = function(field){
        this.data.splice(field,1);
        this.field_names.splice(field,1);
        this.field_translation.splice(field,1);
        this.field_isFactor.splice(field,1);
        this.num_fields--;
    };

    this.copy = function(){

        var new_dt = new data_table();
        var i = 0;

        /* start by storing the simplest information */
        new_dt.num_rows = this.num_rows;
        new_dt.num_fields = this.num_fields;

        /* copy data structure */
        for(i = 0; i < this.num_fields; i++){
            new_dt.field_isFactor[i] = this.field_isFactor[i];
            new_dt.field_names[i] = this.field_names[i];
            new_dt.field_translation.push(this.field_translation[i]);
            new_dt.data.push(this.data[i]);
        }
        
        return new_dt;
    };
    /* serialize data into worker, returns an object of arrays */
    this.serialize = function(){
        var sObj = {data: [], field_names: [], field_translation:[], field_isFactor:[], num_fields:0, num_rows:0};

        /* start by storing the simplest information */
        sObj.num_rows = this.num_rows;
        sObj.num_fields = this.num_fields;

        /* copy data structure */
        for(var i = 0; i < this.num_fields; i++){
            sObj.field_isFactor[i] = this.field_isFactor[i];
            sObj.field_names[i] = this.field_names[i];
            sObj.field_translation.push(this.field_translation[i]);
            sObj.data.push(this.data[i]);
        }

        return sObj;
    };

    /* deserialize data on worker into object */
    this.deserialize = function(sObj){
        var i = 0;

        /* start by storing the simplest information */
        this.num_rows = sObj.num_rows;
        this.num_fields = sObj.num_fields;

        /* copy data structure */
        for(i = 0; i < sObj.num_fields; i++){
            this.field_isFactor[i] = sObj.field_isFactor[i];
            this.field_names[i] = sObj.field_names[i];
            this.field_translation.push(sObj.field_translation[i]);
            this.data.push(sObj.data[i]);
        }
    };
};


/* convert data into datatable structure */
function asDataTable(obj){
    /* declare data.table variable */
    var dt = new data_table();

    /* declare the factor state variable */
    var isFactor = false;
    var un = [];

    /* first verify input data */
    obj = verifyInputData(obj);

    if(obj.hasOwnProperty('data')===false){
        return dt;
    }

    /* strings should be converted to factors */

    /* for each field */

    /* convert all values */
    for(var field = 0; field < obj.meta.fields.length; field++){

        var temp = new Array(obj.data.length);
        for(var line = 0; line < obj.data.length; line++){
            temp[line] = obj.data[line][obj.meta.fields[field]];
        }
        isFactor = false;

        un = [];

        /* convert strings to factors... */
        if(indexOfString(temp) >= 0){


            /* get unique elements */

            un = unique(temp) ;

            for(var j = 0; j < temp.length; j++){
                temp[j] = un.indexOf(temp[j]);
            }
            isFactor = true;
        }

        /* store array */
        dt.data.push(temp);
        dt.field_translation.push(un);
        dt.field_isFactor[field] = isFactor;
        dt.field_names[field] = obj.meta.fields[field];
    }

    /* populate data */
    dt.num_fields = obj.meta.fields.length;
    dt.num_rows = obj.data.length;
    return dt;
}

function verifyInputData(obj){
    var i = 0;

    /* verify if all lines have the same number of fields */
    if(obj.errors.length > 0){
        for(i = 0; i < obj.errors.length; i++){
            /* See if we can fix the error */
            if(obj.errors[i].type === 'Delimiter' || obj.errors[i].type === "Quotes"){
                return [];
            }else if(obj.errors[i].type === 'FieldMismatch'){
                /* remove offending row */
                obj.data.splice(obj.errors[i].row,1);
            }
        }
    }
    return obj;
}

function unique(data){
    var addr = 0, i = 0;
    var new_data = [];
    for( i = 0; i < data.length; i++){
        new_data[i] = data[i];
    }
    new_data.sort();

    for(i = 0; i < new_data.length; i++){
        if(new_data[i] !== new_data[addr]){
            addr++;
            new_data[addr] = new_data[i];
        }
    }
    addr++;
    new_data.length=addr;
    return new_data;
}

/* returns the index of string type or -1 if not found */
function indexOfString(obj){
    var found = -1;
    for(var i = 0; i < obj.length; i++){
        if (typeof obj[i] === 'string'){
            found = i;
            break;
        }
    }
    return found;
}
