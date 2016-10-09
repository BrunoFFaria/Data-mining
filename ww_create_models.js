self.importScripts('rf.js', 'svm.js','data-type.js');





//wait for the start 'CalculatePi' message
//e is the event and e.data contains the JSON object
self.onmessage = function(e) {

    var X = new data_table();
    var Y = [];
    var rf_model = new rf();
    var svm_model = new svm();
    var trained_models = {rf_model:[], svm_model : []};

    var numTrees = 0, giniThresh = 0.1, kerntype = 1, C = 10, gamma = 0.1;

    /* start by deserializing the objects */
    /* surObj.X = X.serialize();
       surObj.Y = Y.slice(0);
       surObj.numTrees = numTrees;
       surObj.giniThresh = giniThresh;
       surObj.kerntype = kerntype;
       surObj.C = C;
       surObj.gamma = gamma;
    */

    X.deserialize(e.data.X);
    Y = e.data.Y;
    numTrees = e.data.numTrees;
    giniThresh = e.data.giniThresh;
    kerntype = e.data.kerntype;
    C = e.data.C;
    gamma = e.data.gamma;

    var st1 = performance.now();

    /* invoke random forest */
    rf_model.train(X, Y, numTrees, giniThresh);

    console.log((performance.now())-st1);

    /* invoke support vector machine*/
    svm_model.train(X,Y,kerntype, C, gamma);

    console.log((performance.now())-st1);

    trained_models.rf_model = rf_model.serialize();
    trained_models.svm_model = svm_model.serialize();

    console.log((performance.now())-st1);

    self.postMessage(trained_models);
};
