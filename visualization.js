
function roc_curve(decision_values, true_labels, pos_class){
    var i = 0, j = 0, fp = [], tp = [];
    var control = [], detection = [];

    /* get unique values in decision_values */
    var thresh = Array.from(new Set(decision_values));
    thresh.sort();
    thresh.reverse();
    
    /* get control and detection sets */
    for(i = 0; i < decision_values.length; i++){
        if(true_labels[i]!=pos_class){
            control.push(decision_values[i]);
        }else{
            detection.push(decision_values[i]);
        }
    }

    /* get roc curve */
    for(i = 0; i < thresh.length; i++){
        fp[i] = 0;
        tp[i] = 0;
        for(j = 0; j < control.length; j++){
            if(control[j]>=thresh[i]){
                fp[i]++;
            }
        }

        for(j = 0; j < detection.length; j++){
            if(detection[j]>=thresh[i]){
                tp[i]++;
            }
        }
        fp[i]/=control.length;
        tp[i]/=detection.length;
    }
    /* fix roc curve to always be ascending */
    //var indexes = sortWithIndeces(fp);

    //console.log(indexes);
    fp.push(1);
    tp.push(1);
    return {fp : fp, tp : tp};
}

function sortWithIndeces(toSort) {
    for (var i = 0; i < toSort.length; i++) {
        toSort[i] = [toSort[i], i];
    }
    toSort.sort(function(left, right) {
        return left[0] < right[0] ? -1 : 1;
    });
    toSort.sortIndices = [];
    for (var j = 0; j < toSort.length; j++) {
        toSort.sortIndices.push(toSort[j][1]);
        toSort[j] = toSort[j][0];
    }
    return toSort;
}

function confusionMat(predicted_labels, true_labels){
    var i = 0, line = 0, col = 0;
    var labels = Array.from(new Set(true_labels)).sort();
    var cm = [];
    /* preallocate confusion matrix */
    for(line = 0; line < labels.length; line++){
        cm[line] = [];
        for(col = 0; col < labels.length; col++){
            cm[line][col] = 0;
        }
    }
    for(i = 0; i < true_labels.length; i++){
        line = labels.indexOf(true_labels[i]);
        col = labels.indexOf(predicted_labels[i]);
        cm[line][col]++;
    }
    return {confMat:cm, labels : labels};
}