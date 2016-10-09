var train_dt = [];
var test_dt = [];
var train_models = {rf_model: new rf(), svm_model : new svm(), numTrees : 100, gini_thresh : 0.1 ,C : 0, kernel : 1, gamma : 0.1, catVar : 0};

function parseTrainData(file){
    $('#filenamevalue_train').html( file.name + '<i class="fa fa-spinner fa-pulse" aria-hidden="true"></i>' );
    Papa.parse(file, {
        delimiter: "",	// auto-detect
        newline: "",	// auto-detect
        header: true,
        dynamicTyping: true,
        preview: 0,
        encoding: "",
        worker: true,
        comments: false,
        step: undefined,
        complete: function (results) {
            train_dt = asDataTable(results);

            /* display data */

            display_data(train_dt,'parsed_train_data', 'train_data_table', 'train_data_pager');

            /* remove function from dom*/
            $('#train_data_pager').empty();

            /* add function to the dom */
            $('#train_data_table').pageMe({
                pagerSelector: '#train_data_pager',
                showPrevNext: true,
                hidePageNumbers: false,
                perPage: 10
            });

            /* clear spinner */
            $('#filenamevalue_train').text(file.name);

            /* set category variable select */
            var vals = "";
            /* the last variable that is categoric should be class*/
            for(var i = train_dt.num_fields-1; i >= 0; i--){
                if(train_dt.field_isFactor[i]){
                    vals += "<option>" + train_dt.field_names[i]+"</option>";
                }else{
                    vals += "<option>" + train_dt.field_names[i]+"</option>";
                }
            }
            $('#catSel').selectpicker('destroy');
            //document.getElementById('class_var_select').innerHTML = vals;
            $('#catSel').html(vals);
            $('#catSel').selectpicker('refresh');

        },
        error: function(error){
            console.log(error);
            error_handler(error);
        },
        download: false,
        skipEmptyLines: false,
        chunk: undefined,
        fastMode: undefined,
        beforeFirstChunk: undefined,
        withCredentials: undefined
    });


}

function parseTestData(file){
    $('#filenamevalue_test').html( file.name + '<i class="fa fa-spinner fa-pulse" aria-hidden="true"></i>' );
    Papa.parse(file, {
        delimiter: "",	// auto-detect
        newline: "",	// auto-detect
        header: true,
        dynamicTyping: true,
        preview: 0,
        encoding: "",
        worker: true,
        comments: false,
        step: undefined,
        complete: function (results) {
            test_dt = asDataTable(results);

            /* display data */

            display_data(test_dt,'parsed_test_data', 'test_data_table', 'test_data_pager');

            /* remove function from dom*/
            $('#test_data_pager').empty();

            /* add function to the dom */
            $('#test_data_table').pageMe({
                pagerSelector: '#test_data_pager',
                showPrevNext: true,
                hidePageNumbers: false,
                perPage: 10
            });

            /* clear spinner */
            $('#filenamevalue_test').text(file.name);
        },
        error: function(error){
            console.log(error);
            error_handler(error);
        },
        download: false,
        skipEmptyLines: false,
        chunk: undefined,
        fastMode: undefined,
        beforeFirstChunk: undefined,
        withCredentials: undefined
    });


}






function display_data(dt,doc_id,table_id, pager_id){

    var content = '';
    var i = 0, j = 0;
    var row_val = [];
    /* turn off div tag */
    document.getElementById(doc_id).style.visibility='hidden';
    /* start by displaying header */
    content += '<thead><tr><th class="text-center">#</th>';
    for(i = 0; i < dt.num_fields; i++){
        content+='<th class="text-center">'+dt.field_names[i]+'</th>';
    }
    content+='</tr></thead><tbody id="'+table_id+'">';
    for(i = 0; i < dt.num_rows; i++){
        content+='<tr><td class="text-center">' + i + '</td>';
        row_val = dt.get_orig_row(i);
        for(j = 0; j < row_val.length; j++){
            content+='<td class="text-center">'+row_val[j]+'</td>';
        }
        content+='</tr>';
    }

    content = content + '</tbody>';

    document.getElementById(doc_id).innerHTML = content;
    document.getElementById(doc_id).style.visibility='visible';
}

function formatInputData(){

}

function genModels(catVar, numTrees, giniThresh, C, kerntype, gamma){

    var surObj = {X:[], Y:[], numTrees:0, giniThresh:0.1, kerntype:1, C:10, gamma:0.1};
    var catField = train_dt.field_names.indexOf(catVar);

    /* separate data*/
    var Y = train_dt.get_field(catField);
    var X = train_dt.copy();

    X.remove_field(catField);

    /* set category class from train set */
    var category_names = [];

    /* the last variable that is categoric should be class */

    /* surrender X and Y, numTrees, giniThresh, kerntype, C, gamma to the worker thread*/
    surObj.X = X.serialize();
    surObj.Y = Y.slice(0);
    surObj.numTrees = numTrees;
    surObj.giniThresh = giniThresh;
    surObj.kerntype = kerntype;
    surObj.C = C;
    surObj.gamma = gamma;

    /* start filling training models variable */
    train_models.catVar = catVar;
    train_models.numTrees = numTrees;
    train_models.gini_thresh = giniThresh;
    train_models.kernel = kerntype;
    train_models.C = C;
    train_models.gamma = gamma;

    /* lock the UI interface */
    $('#myPleaseWait').modal('show');

    /* ========================
     * = LAUNCH WORKER THREAD =
     * ========================
     */
    var ww = new Worker('cms/template/js/resources/ww_create_models.js');

    ww.onmessage = function(e) {

        /* handle messages from worker */

        $('#myPleaseWait').modal('hide');
        console.log(e.data);
        train_models.rf_model.deserialize(e.data.rf_model);
        train_models.svm_model.deserialize(e.data.svm_model);


        /* the variable may be categoric but no translation was used so either choose or not the translation */
        for(var i = 0; i < train_models.rf_model.classes.length; i++){
            var category = train_models.rf_model.classes[i];

            /* convert value into name */
            if(train_dt.field_translation[catField].length == 0){
                category_names[i] = category;
            }else{
                category_names[i] = train_dt.field_translation[catField][category];
            }

        }

        var vals = "";
        for(i = 0; i < category_names.length; i++){
            vals += "<option>" + category_names[i] +"</option>";
        }

        $('#pos_class').selectpicker('destroy');
        $('#pos_class').html(vals);
        $('#pos_class').selectpicker('refresh');

        category_names.reverse();

        vals = "";
        for(i = 0; i < category_names.length; i++){
            vals += "<option>" + category_names[i] +"</option>";
        }

        $('#neg_class').selectpicker('destroy');
        $('#neg_class').html(vals);
        $('#neg_class').selectpicker('refresh');

    };

    ww.onerror = function(e) {
        alert('Error: Line ' + e.lineno + ' in ' + e.filename + ': ' + e.message);
    };

    /* lock the UI (the user should receive a loading message)*/

    /* start the worker */
    ww.postMessage(surObj);

}

function testModels(neg_class, pos_class){
    /* first verify if the selected category var exists in the test set*/
    if(test_dt.field_names.indexOf(train_models.catVar)<0){
        bootbox.alert('<span><i class="fa fa-exclamation-triangle fa-3x text-center center-block" aria-hidden="true"></i><h2>Datasets with different variables</h2></span>');
    }else{
        var catField = test_dt.field_names.indexOf(train_models.catVar);
        if(test_dt.field_translation[catField].length>0){
            var pos_class_v = test_dt.field_translation[catField].indexOf(pos_class);
            var neg_class_v = test_dt.field_translation[catField].indexOf(neg_class);
        }else{
            pos_class_v = parseInt(pos_class);
            neg_class_v = parseInt(neg_class);
        }

        /* separate data*/
        var Y = test_dt.get_field(catField);
        var X = test_dt.copy();
        var rf_answer = [];
        var svm_answer = [];
        var rf_cm = [], svm_cm = [], svm_dec = [], rf_dec = [], pi = 0, ni = 0;
        var rf_roc = [], svm_roc = [], temp = [], Y_roc = [];
        
        X.remove_field(catField);

        /* invoke random forest */
        rf_answer = train_models.rf_model.evaluate(X);

        /* invoke support vector machine*/
        svm_answer = train_models.svm_model.evaluate(X);

        /* first compute the confusion matrixes of both models */
        rf_cm = confusionMat(rf_answer.predict_labels, Y);
        svm_cm = confusionMat(svm_answer.predict_labels, Y);

        /* convert classes to names */
        if(test_dt.field_translation[catField].length>0){
            for(i = 0; i < svm_cm.labels.length; i++){
                svm_cm.labels[i] = test_dt.field_translation[catField][svm_cm.labels[i]];
            }
        }
        if(test_dt.field_translation[catField].length>0) {
            for(i = 0; i < rf_cm.labels.length; i++){
                rf_cm.labels[i] = test_dt.field_translation[catField][rf_cm.labels[i]];
            }
        }

        /* display confusion matrixes */
        display_cm_data('sm_cm_matrix', svm_cm, 'title_svm_cm');
        display_cm_data('rf_cm_matrix', rf_cm, 'title_rf_cm');

        /* ROC CURVE */

        /* now get decision values */
        if(pos_class_v !== neg_class_v){
            temp = train_models.svm_model.get_decision_values(X, pos_class_v, neg_class_v);
            pi = rf_answer.class_names.indexOf(pos_class_v);
            ni = rf_answer.class_names.indexOf(neg_class_v);

            for(var i = 0; i < rf_answer.class_prob.length; i++){
                /* restrict decision values to pos and neg class */
                if(Y[i] == pos_class_v || Y[i] == neg_class_v){
                    svm_dec.push(temp.decision_val[i]);
                    rf_dec.push(rf_answer.class_prob[i][pi]/(rf_answer.class_prob[i][pi]+rf_answer.class_prob[i][ni]));
                    Y_roc.push(Y[i]);
                }
            }
            /* compute roc curves */
            svm_roc = roc_curve(svm_dec, Y_roc, pos_class_v);
            rf_roc = roc_curve(rf_dec, Y_roc, pos_class_v);

            /* lets attempt to do some plotting */
            Plotly.plot(document.getElementById('roc_curve_plot'),
                [
                    {x:svm_roc.fp , y:svm_roc.tp, mode: 'lines+markers', name: 'SVM'},
                    {x:rf_roc.fp , y:rf_roc.tp, mode: 'lines+markers', name: 'RF'}
                ],{
                    title:'ROC curve SVM vs RF',
                    showlegend: true,
                    legend: {"orientation": "h"}
                });
            document.getElementById('clearGraph').style.visibility='visible';
        }
        /* get new section height */

    }
}

function display_cm_data(id, data, title_id){
    var content = '';
    var i = 0, j = 0;
    var row_val = [];
    /* turn off div tag */
    document.getElementById(id).style.visibility='hidden';

    /* start by displaying header */
    content += '<thead><tr><th style="border-style:hidden;"></th><th style="border-style:hidden;"></th><th class="text-center" colspan='+data.labels.length+'>Predicted Category</th></tr></tr><tr><th class="text-center" style="border-style: hidden"></th><th class="text-center" ></th>';
    for(i = 0; i < data.labels.length; i++){
        content+='<th class="text-center">'+data.labels[i]+'</th>';
    }
    content+='</tr></thead><tbody><tr><td class="rotate" style="padding-top:70px;" rowspan="'+(data.labels.length+1)+'"><b>True Category</b></td></tr>';
    for(i = 0; i < data.labels.length; i++){
        content+='<tr><td class="text-center"><b>' + data.labels[i] + '</b></td>';

        for(j = 0; j < data.labels.length; j++){
            content+='<td class="text-center">'+data.confMat[i][j]+'</td>';
        }
        content+='</tr>';
    }

    content = content + '</tbody>';

    document.getElementById(id).innerHTML = content;
    document.getElementById(id).style.visibility='visible';
    document.getElementById(title_id).style.visibility='visible';
}