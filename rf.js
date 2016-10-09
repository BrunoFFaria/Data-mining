var tree = function(){
    this.v_split = [];
    this.f_split = [];
    this.child_l = [];
    this.child_r = [];
    this.label = [];
    this.leaf = [];
    this.node = 0;
    this.classes = [];  /* set by callee */

    this.generate_tree = function(X, Y, I, node, gin, k, gini_threshold){
        this.node = node;

        if(gin <= gini_threshold){
            this.label[node] = this.get_frequent_label(Y, I);
            this.leaf[node] = true;

            this.f_split[node] = -1;
            this.v_split[node] = -1;
            this.child_l[node] = node;
            this.child_r[node] = node;
        }else{
            this.leaf[node] = false;
            this.label[node] = -1;
            /* algorithm variables */
            var Il_split = [];
            var Ir_split = [];
            var F = [];

            var f_split = 0, v_split = 0, gi_decrease = 0, gil_split = 0, gir_split = 0;

            /* aux variables */
            var f = 0, fi = 0, v = 0, vi = 0, i = 0, Pl = 0, Pr = 0, gil = 0, gir = 0, delta_gi = 0;
            var XI = [], un = [], Il = [], Ir = [];

            /* get k features from X feature space */
            F = this.get_k_features(k,X.num_fields);

            /* search for the best feature */
            for(fi = 0; fi < F.length; fi++){
                f = F[fi];

                /* get feature f from X but only the indexed ones */
                XI = X.get_field_by_indexes(f, I);

                /* get unique values in XII */
                un = this.unique(XI);
                for(vi = 0; vi < un.length; vi++){
                    v = un[vi];

                    /* get pl and pr */
                    Pl = 0; Pr = 0;
                    Il = [];
                    Ir = [];
                    for(i = 0; i < XI.length; i++ ){
                        if(XI[i] < v){
                            Pl++;
                            Il[Il.length] = I[i];
                        }else{
                            Pr++;
                            Ir[Ir.length] = I[i];
                        }
                    }
                    Pl /= XI.length;
                    Pr /= XI.length;

                    /* compute gini impurity of both nodes */
                    gil = this.gini_impurity(Y, Il);
                    gir = this.gini_impurity(Y, Ir);

                    /* compute gini decrease */
                    delta_gi = gin - Pl*gil - Pr * gir;

                    /* is gini decrease the best we have achieved? */
                    if(delta_gi > gi_decrease){
                        Il_split = []; Ir_split = [];

                        /* copy Il and Ir */
                        for(i = 0; i < Il.length; i++){
                            Il_split[i] = Il[i];
                        }
                        for(i = 0; i < Ir.length; i++){
                            Ir_split[i] = Ir[i];
                        }
                        f_split = f;
                        v_split = v;
                        gi_decrease = delta_gi;
                        gil_split = gil;
                        gir_split = gir;
                    }
                }
            }
            /* recursively divide the dataset */
            this.f_split[node] = f_split;
            this.v_split[node] = v_split;
            this.child_l[node] = node + 1;
            this.generate_tree(X, Y, Il_split, node+1, gil_split, k, gini_threshold);
            this.child_r[node] = this.node+1;
            this.generate_tree(X, Y, Ir_split, this.node+1, gir_split, k, gini_threshold);
        }
    };

    /* get gini impurity of child node */
    this.gini_impurity = function(Y, I){
        var classes_cnts = new Array(this.classes.length);
        var i = 0, index = 0, sum = 0, norm = 0;
        /* allocate classes to zero*/
        for(i = 0; i < this.classes.length; i++){
            classes_cnts[i] = 0;
        }
        /* compute Y[I] class representativeness*/
        for(i = 0; i < I.length; i++){
            index = this.classes.indexOf(Y[I[i]]);
            if(index >=0 ){
                classes_cnts[index]++;
            }
        }

        for(i = 0; i < classes_cnts.length; i++){
            norm += classes_cnts[i];
        }

        /* divide each class cnt by the total sum, power it and add it to the sum var */
        if(norm!=0){
            for(i = 0; i < classes_cnts.length; i++){
                sum += (classes_cnts[i]/norm) * (classes_cnts[i]/norm);
            }
        }
        return (1-sum);
    };

    /* get unique values in array */
    this.unique = function (data){
        /*var addr = 0, i = 0;
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

        */
        return Array.from(new Set(data)).sort();
    };


    /* get the class of the sample from this tree */
    this.get_tree_class = function(sample, node){
        if(this.leaf[node] === true){
            return this.label[node];
        }else{
            if(sample[this.f_split[node]] < this.v_split[node]){
                return this.get_tree_class(sample, this.child_l[node]);
            }else{
                return this.get_tree_class(sample, this.child_r[node]);
            }
        }
    };

    /* sample k features from X feature space */
    this.get_k_features = function(k,num_features){
        var sample = [];
        for(var i = 0; i < k; i++){
            sample[i] = Math.floor(Math.random()*num_features);
        }
        return sample;
    };

    /* get the most frequent label in itemset */
    this.get_frequent_label = function(Y, I){
        var temp = new Array(I.length);
        var counts = new Array(I.length);
        var i = 0, addr = 0, max = 0;
        for(i = 0; i < I.length; i++){
            temp[i] = Y[I[i]];
        }
        temp.sort();
        counts[0] = 0;
        for(i = 0; i < temp.length; i++){
            if(temp[i] !== temp[addr]){
                addr++;
                temp[addr] = temp[i];
                counts[addr] = 1;
            }else{
                counts[addr]++;
            }
        }
        addr++;
        temp.length = addr;
        counts.length = addr;
        max = counts[0];
        addr = 0;
        for(i = 0; i < counts.length; i++){
            if(counts[i] > max){
                max = counts[i];
                addr = i;
            }
        }
        return temp[addr];
        /*
        var temp = new Array(I.length);
        var i = 0, max = 0, addr = 0;
        for(i = 0; i < I.length; i++){
            temp[i] = Y[I[i]];
        }
        var aCount = new Map([...new Set(temp)].map(x => [x, temp.filter(y => y === x).length]));
        max = aCount(0);
        for(i = 0; i < aCount.length; i++){

        }
        */
    };

    this.serialize = function(){
        var sObj = {v_split:[], f_split:[], child_l:[], child_r:[], label:[], leaf:[], node: 0, classes:[]};
        sObj.v_split = this.v_split.slice(0);
        sObj.f_split = this.f_split.slice(0);
        sObj.child_l = this.child_l.slice(0);
        sObj.child_r = this.child_r.slice(0);
        sObj.label   = this.label.slice(0);
        sObj.leaf    = this.leaf.slice(0);
        sObj.node    = this.node;
        sObj.classes = this.classes.slice(0);  /* set by callee */
        return sObj;
    };

    this.deserialize = function(sObj){
        this.v_split = sObj.v_split.slice(0);
        this.f_split = sObj.f_split.slice(0);
        this.child_l = sObj.child_l.slice(0);
        this.child_r = sObj.child_r.slice(0);
        this.label   = sObj.label.slice(0);
        this.leaf    = sObj.leaf.slice(0);
        this.node    = sObj.node;
        this.classes = sObj.classes.slice(0);  /* set by callee */
    };
};

var rf = function(){
    this.trees = [];
    this.classes = [];
    this.giniThresh = 0;
    /* generate the multiple trees */
    this.train = function(X, Y, m, gini){
        var i = 0, k = 0;
        var I = [];
        //var Xi = X.copy();
        this.giniThresh = gini;
        for(i = 0; i < m; i++){
            /* initialise tree */
            this.trees[i] = new tree();

            /* set classes */
            if(i == 0){
                this.classes = this.trees[0].unique(Y);
            }

            /* pass reference to child */
            this.trees[i].classes = this.classes;

            /* just grab the indexes, no need to generate a full dataset (VERIFY IF EVERYTHING IS OK WITH THIS)*/
            I = this.bag_train_set(X);

            /* the number of features to select
             *(I could use one of the three possibilities that breiman advises, I chose this one)
             *
             */
            k = Math.floor(Math.sqrt(X.num_fields));

            /* generate tree */
            this.trees[i].generate_tree(X, Y, I, 0, 1, k, gini);
        }

    };

    this.evaluate = function(X){
        var i = 0, j = 0, max = 0;

        /* vector with the classification attributed by each class */
        var tree_responses = [];

        /* send an object as answer */
        var answer = {class_prob : [], class_names : this.classes, predict_labels : []};

        /* compute the probability for each class */
        for(i = 0; i < X.num_rows; i++){
            tree_responses = [];
            for(j = 0; j < this.trees.length; j++){
                tree_responses[j] = this.trees[j].get_tree_class(X.get_row(i), 0);
            }

            /* get frequency count */
            answer.class_prob.push(this.get_class_frequencies(tree_responses));

            /* get maximum of frequency count */
            max = answer.class_prob[i][0];
            for(j = 0; j < answer.class_prob[i].length; j++){
                if(answer.class_prob[i][j] > max){
                    max = answer.class_prob[i][j];
                }
            }
            answer.predict_labels[i] = this.classes[answer.class_prob[i].indexOf(max)];
        }
        return answer;
    };

    this.bag_train_set = function(X){
        var i = 0;
        var indexes = [];
        /* generate a new bag by  */
        for(i = 0; i < X.num_rows; i++){
            indexes[i] = Math.floor(Math.random()*X.num_rows);
        }
        return indexes;
    };

    this.get_class_frequencies = function(tree_results){
        var i = 0, addr = 0;
        var counts = new Array(this.classes.length);
        var class_results = new Array(this.classes.length);

        tree_results.sort();

        for(i = 0; i < class_results.length; i++){
            class_results[i] = 0;
            counts[i] = 0;
        }

        counts[addr] = 0;
        for(i = 0; i < tree_results.length; i++){
            if(tree_results[i] !== tree_results[addr]){
                addr++;
                tree_results[addr] = tree_results[i];
                counts[addr] = 1;
            }else{
                counts[addr]++;
            }
        }
        addr++;

        counts.length = addr;



        /* reorder according to the class structure */
        for(i = 0; i < counts.length; i++){
            addr = this.classes.indexOf(tree_results[i]);
            if(addr>=0){
                class_results[addr] = counts[i];
            }
        }
        return class_results;
    };

    this.serialize = function(){
        var sObj = {trees: [], classes:[], giniThresh: 0 };

        /* serialize each tree */
        for(var i = 0; i < this.trees.length; i++){
            sObj.trees[i] = this.trees[i].serialize();
        }
        sObj.classes = this.classes.slice(0);
        sObj.giniThresh = this.giniThresh;
        return sObj;
    };

    this.deserialize = function(sObj){
        for(var i = 0; i < sObj.trees.length; i++){
            /* deserialize tree */
            this.trees[i] = new tree();
            this.trees[i].deserialize(sObj.trees[i]);
        }

        /* deserialize classes */
        this.classes = sObj.classes.slice(0);
    };
};