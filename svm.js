var smo_wwss3 = function() {
    this.tol = 1e-3;
    this.tau = 1e-12;
    this.alpha = [];
    this.C = 0;
    this.G = [];
    this.xi = [];
    this.yi = [];
    this.b = 0;
    this.kernel_c = 0.1;
    this.kernel = 1;

    this.selectB = function(Q, y, C, indexes){
        var i = 0, j = 0, t = 0, G_max = -Infinity, G_min = Infinity;
        var obj_min = Infinity, a = 0, b = 0;

        /* start by selecting i */
        i = -1;

        for(t = 0; t < indexes.length; t++) {
            if((y[t] == +1 && this.alpha[t] < C) ||
                    (y[t] == -1 && this.alpha[t] > 0)) {
                if (-y[t] * this.G[t] >= G_max) {
                    i = t;
                    G_max = -y[t] * this.G[t];
                }
            }
        }

        /* select j */
        j = -1;
        obj_min = Infinity;
        for(t = 0; t < indexes.length; t++) {
            if ((y[t] == +1 && this.alpha[t] > 0) || (y[t] == -1 && this.alpha[t] < C)) {
                b = G_max + y[t] * this.G[t];
                if (-y[t] * this.G[t] <= G_min) {
                    G_min = -y[t] * this.G[t];
                }

                if (b > 0) {
                    a = Q[i][i] + Q[t][t] - 2 * y[i] * y[t] * Q[i][t];
                    if (a <= 0) {
                        a = this.tau;
                    }
                    if (-(b * b) / a <= obj_min) {
                        j = t;
                        obj_min = -(b * b) / a;
                    }
                }
            }
        }

        if (G_max-G_min < this.tol) {
            i = -1;
            j = -1;
        }
        return {i:i,j:j};
    };

    this.solve_optim = function(Q, y, C, indexes){
        /* main routine
         * Inputs:
         * y:   array of {+1, -1}: class of the i-th instance
         * Q:   Q[i][j] = y[i]*y[j]*K[i][j]; K: kernel matrix
         * len: number of instances
         * eps = 1e-3  // stopping tolerance
         * tau = 1e-12
         */
        var i = 0, j = 0, t = 0, a = 0, b = 0, ij = {i:0,j:0};
        var oalphai = 0, oalphaj = 0, sum = 0, delta_alphi = 0, delta_alphj = 0;

        for(i = 0; i < indexes.length; i++){
            this.alpha[i] = 0;
            this.G[i] = -1;
        }


        while(1){
            /* select violating pair */
            ij = this.selectB(Q, y, C, indexes);

            /* returned i, j are not index based (Q and y have been constructed from indexes )*/
            i = ij.i; j = ij.j;

            if (j == -1){
                break;
            }

            /* working set is (i,j) */
            a = Q[i][i]+Q[j][j]-2*y[i]*y[j]*Q[i][j];
            if (a <= 0){
                a = this.tau;
            }
            b = -y[i]*this.G[i]+y[j]*this.G[j];

            /* update alpha */
            oalphai = this.alpha[i];
            oalphaj = this.alpha[j];

            this.alpha[i] += y[i]*b/a;
            this.alpha[j] -= y[j]*b/a;

            /* project alpha back to the feasible region */
            sum = y[i]*oalphai+y[j]*oalphaj;
            if(this.alpha[i] > C){
                this.alpha[i] = C;
            }

            if(this.alpha[i] < 0){
                this.alpha[i] = 0;
            }

            this.alpha[j] = y[j]*(sum-y[i]*this.alpha[i]);
            if(this.alpha[j] > C){
                this.alpha[j] = C;
            }
            if(this.alpha[j] < 0){
                this.alpha[j] = 0;
            }
            this.alpha[i] = y[i]*(sum-y[j]*this.alpha[j]);

            /* update gradient */
            delta_alphi = this.alpha[i] - oalphai;
            delta_alphj = this.alpha[j] - oalphaj;
            for(t = 0; t < indexes.length; t++){
                this.G[t] += Q[t][i]*delta_alphi+Q[t][j]*delta_alphj;
            }
        }
    };

    this.compute_b = function(C){
        var ct = 0, result = 0, sum = 0;
        var b = [], x = [], y = [], k = 0;
        for(var i = 0; i < this.alpha.length; i++) {
            if (this.alpha[i] > 0 && this.alpha[i] < C) {
                for(k = 0; k < this.xi.length; k++){
                    y[k] = this.xi[k][i];
                }
                result = 0;
                for (var j = 0; j < this.alpha.length; j++) {
                    for(k = 0; k < this.xi.length; k++){
                        x[k] = this.xi[k][j];
                    }

                    result += this.alpha[j] * this.yi[j] * this.evaluate_kernel(x, y);
                }
                b[ct] = 1 / this.yi[i] - result;
                ct++;
            }
        }
        if(b.length > 0) {
            sum = 0;
            for(i = 0; i < b.length; i++) {
                sum += b[i];
            }
            sum/=b.length;
        }else {
            sum = 0;
        }
        return sum;
    };

    this.train = function(X, Y, kernel, C, gamma, indexes){

        var Q = [], temp = [];
        var i = 0, j = 0, ct = 0;

        /* store values */
        this.kernel = kernel;
        this.kernel_c = gamma;
        this.C = C;

        /* evaluate kernel for every pair of points */
        for( i = 0; i < indexes.length; i++){
            Q[i] = [];
            for(j = 0; j < indexes.length; j++){
                Q[i][j] = Y[i] * Y[j] * this.evaluate_kernel_train(X, indexes[i], indexes[j]);
            }
        }

        /* call solver */
        this.solve_optim(Q, Y, C, indexes);

        /* store support vectors */
        this.yi = [];
        temp = [];

        for(j = 0; j < X.length; j++){
            this.xi[j] = [];
        }

        for(i = 0; i < this.alpha.length; i++){
            if(this.alpha[i] > 0 && this.alpha[i] <= C){
                /* store targets */
                this.yi[ct] = Y[i];

                /* store support vectors */
                for(j = 0; j < X.length; j++){
                    this.xi[j][ct] = X[j][indexes[i]];
                }
                /* store alpha */
                temp[ct] = this.alpha[i];
                ct++;
            }
        }
        /* copy support alphas to alpha */
        this.alpha = temp.slice(0);

        /* compute b */
        this.b = this.compute_b(C);
    };

    this.evaluate_kernel = function(x, y){
        var val = 0, k = 0;

        switch(this.kernel){
            case 2:
                val = 0;
                for(k = 0; k < x.length; k++){
                    val += x[k] * y[k];
                }
                val += this.kernel_c;
                val *= val;
                /* val = ((x * y') + c) ^ 2; */
                break;
            case 3:
                val = 0;
                for(k = 0; k < x.length; k++){
                    val += (x[k] - y[k]) * (x[k] - y[k]);
                }
                val = Math.sqrt(val);
                val *= val;
                val *= (-this.kernel_c);
                val = Math.exp(val);

                /*val = exp((-c)*sqrt( (x - y ) * (x - y)' )^2); */
                break;
            default:
                /* linear kernel */
                val = 0;
                for(k = 0; k < x.length; k++){
                    val += x[k] * y[k];
                }
                break;
        }
        return val;
    };

    this.evaluate_kernel_train = function(X, i, j){
        var x = [], y = [], k = 0;
        for(k = 0; k < X.length; k++){
            x[k] = X[k][i];
            y[k] = X[k][j];
        }
        return this.evaluate_kernel(x,y);
    };

    this.predict = function(X){
        var  i = 0, j = 0, k = 0, x = [], y = [];
        var result = [];
        /* evaluate each row in X */
        for(i = 0; i < X[0].length; i++){
            result[i] = 0;
            /* build x and y */
            for(k = 0; k < X.length; k++){
                x[k] = X[k][i];
            }
            /* evaluate decision function */
            for(j = 0; j < this.alpha.length; j++){
                for(k = 0; k < this.xi.length; k++){
                    y[k] = this.xi[k][j];
                }
                result[i] += this.alpha[j] * this.yi[j] * this.evaluate_kernel( y, x);
            }
            result[i] += this.b;
        }
        return result;
    };

    this.serialize = function(){
        var sObj = {alpha:[], xi:[], yi:[], tol:10^(-3), tau:10^(-12),  C:0, b:0, kernel:1, kernel_c:0.1};
        sObj.alpha = this.alpha.slice(0);
        sObj.yi = this.yi.slice(0);
        for(var i = 0; i < this.xi.length; i++){
            sObj.xi.push(this.xi[i]);
        }
        sObj.tol = this.tol;
        sObj.tau = this.tau;
        sObj.C = this.C;
        sObj.b = this.b;
        sObj.kernel = this.kernel;
        sObj.kernel_c = this.kernel_c;
        return sObj;

    };

    this.deserialize = function(sObj){
        this.alpha = sObj.alpha.slice(0);
        this.yi = sObj.yi.slice(0);
        for(var i = 0; i < sObj.xi.length; i++){
            this.xi.push(sObj.xi[i]);
        }
        this.tol = sObj.tol;
        this.C = sObj.C;
        this.tau = sObj.tau;
        this.b = sObj.b;
        this.kernel = sObj.kernel;
        this.kernel_c = sObj.kernel_c;
    };
};



var smo = function() {
    this.alpha = [];            /* lagrange multipliers */
    this.E = [];                /* error in binary classification */
    this.xi = [];               /* input vector space */
    this.yi = [];               /* target vector space */
    this.tol = 10 ^ (-3);       /* admitable tolerance in a change, anything smaller will not be considered */
    this.C = 0;                 /* hard soft margin tradeoff */
    this.b = 0;                 /* threshold from origin */
    this.K = [];                /* kernel cache */
    this.kernel = 1;            /* the kernel used */
    this.kernel_c = 0.1;        /* kernel parameter used */
    this.optim_val = 0;         /* current optimal, not used */
    this.dec_indexes = [];      /* indexes used during training to evaluate the optmization function value */
    this.nonboundalpha = 0;     /* number of nonbound alphas */

    this.take_step = function (i1, i2, E1) {
        var alph1 = 0, alph2 = 0, y1 = 0, y2 = 0, s = 0, E2 = 0, H = 0, L = 0, temp = 0;
        var k11 = 0, k22 = 0, k12 = 0, eta = 0, a1 = 0, a2 = 0;
        var f1 = 0, f2 = 0, l1 = 0, h1 = 0, Lobj = 0, Hobj = 0, bold = 0;
        var b1 = 0, b2 = 0, d1 = 0, d2 = 0;
        var i = 0;
        if (i1 == i2) {          /* should not happen, measures were taken for this to not happen */
            return 0;
        }

        alph1 = this.alpha[i1];
        alph2 = this.alpha[i2];

        y1 = this.yi[i1];
        y2 = this.yi[i2];
        s = y1 * y2;

        if (alph2 > 0 && alph2 < this.C) {
            E2 = this.E[i2];
        } else {
            E2 = this.predict_train(i2) - y2;
        }

        /* compute L e H */
        if (y1 != y2) {
            temp = alph2 - alph1;
            if (temp > 0) {
                L = temp;
                H = this.C;
            } else {
                H = this.C + temp;
                L = 0;
            }
        } else {
            temp = alph2 + alph1;
            if (temp > this.C) {
                L = temp - this.C;
                H = this.C;
            } else {
                H = temp;
                L = 0;
            }
        }


        if (L == H) {
            return 0;
        }

        /* get objects in cache */
        k11 = this.K[i1][i1];
        k12 = this.K[i1][i2];
        k22 = this.K[i2][i2];

        eta = k11 + k22 - 2 * k12;

        if (eta > 0) {
            a2 = alph2 + y2 * (E1 - E2) / eta;

            if (a2 <= L) {
                a2 = L;
            } else if (a2 >= H) {
                a2 = H;
            }
        } else {
            /* evaluate objective function at a2 (in principle only the elements involving a2 are required) */
            f1 = y1 * (E1 + this.b) - alph1 * k11 - s * alph2 * k12;
            f2 = y2 * (E2 + this.b) - alph2 * k22 - s * alph1 * k12;
            l1 = alph1 + s * (alph2 - L);
            h1 = alph1 + s * (alph2 - H);
            Lobj = l1 * f1 + L * f2 + 0.5 * l1 * l1 * k11 + 0.5 * L * L * k22 + s * L * l1 * k12;
            Hobj = h1 * f1 + H * f2 + 0.5 * h1 * h1 * k11 + 0.5 * H * H * k22 + s * H * h1 * k12;

            if (Lobj < Hobj - this.tol) {
                a2 = L;
            } else if (Lobj > Hobj + this.tol) {
                a2 = H;
            } else {
                a2 = alph2;
            }
        }

        if (Math.abs(a2 - alph2) < this.tol * (a2 + alph2 + this.tol)) {
            return 0;
        }

        a1 = alph1 + s * (alph2 - a2);
        bold = this.b;

        /* update threshold b */
        if (a1 > 0 && a1 < this.C) {
            b1 = E1 + y1 * (a1 - alph1) * k11 + y2 * (a2 - alph2) * k12;
            this.b += b1;
        } else if (a2 > 0 && a2 < this.C) {
            b2 = E2 + y1 * (a1 - alph1) * k12 + y2 * (a2 - alph2) * k22;
            this.b += b2;
        } else {
            d1 = y1 * (a1 - alph1);
            d2 = y2 * (a2 - alph2);
            b1 = E1 + d1 * k11 + d2 * k12 + this.b;
            b2 = E2 + d1 * k12 + d2 * k22 + this.b;
            this.b = (b1 + b2) / 2;
        }
        /* store new a1 and a2 in the alpha array */
        this.alpha[i1] = a1;
        this.alpha[i2] = a2;

        /* update decision function and error cache */
        this.dec_indexes = [];
        this.nonboundalpha = 0;
        for(i = 0; i < this.alpha.length; i++){
            if (this.alpha[i] > 0 && this.alpha[i] <= this.C){
                /* decision function indexes */
                this.dec_indexes.push(i);

                /* error cache update */
                this.E[i] += (a1 - alph1) * y1 * this.K[i1][i] + (a2 - alph2) * y2 * this.K[i2][i] + (bold - this.b);

                /* update number of non bound alpha */
                this.nonboundalpha++;
            }
        }

        if(a1>0 && a1 < this.C){
            this.E[i1] = 0;
        }

        if(a2 > 0 && a2 < this.C){
            this.E[i2] = 0;
        }
        return 1;
    };

    this.examineExample = function(i1){
        var y1 = 0, alph1 = 0, E1 = 0, r1 = 0, i = 0, min_error = 0, first_step = 1, index = 0, k0 = [];

        y1 = this.yi[i1];
        alph1 = this.alpha[i1];

        if(alph1 > 0 && alph1 < this.C){
            E1 = this.E[i1];
        }else{
            E1 = this.predict_train( i1 ) - y1;
        }

        r1 = E1 * y1;

        if((r1 < -this.tol && alph1 < this.C) || (r1 > this.tol && alph1 > 0)){

            if( this.nonboundalpha > 1){
                /* for the non bound alpha choose one e1 that is
                /* different than e2
                 */
                for(i = 0; i < this.dec_indexes; i++){
                    /* decision indexes includes bound alphas superior limit (C) so avoid those :S */
                    if(this.alpha[this.dec_indexes[i]] < this.C){
                        if(this.dec_indexes[i]!=i1){
                            if(first_step == 0){
                                if(Math.abs(E1 - this.E[this.dec_indexes[i]]) > min_error){
                                    min_error = Math.abs(E1 - this.E[this.dec_indexes[i]]);
                                    index = i;
                                }
                            }else{
                                min_error = Math.abs(E1 - this.E[this.dec_indexes[i]]);
                                first_step = 0;
                                index = i;
                            }
                        }
                    }
                }
                /* do one step */
                if(this.take_step(i1, index, E1)){
                    return 1;
                }
            }

            /* loop all over nonbound alpha starting at random point */
            k0 = this.perm(this.dec_indexes.length);
            for(i = 0; i < this.dec_indexes.length; i++){
                /* avoid C bounded alphas */
                if(this.alpha[k0[i]] < this.C){
                    if(this.take_step(i1, k0[i], E1)){
                        return 1;
                    }
                }
            }
            /* okay go to every alpha and check if we can do further progress */
            k0 = this.perm(this.alpha.length);
            for(i = 0; i < this.alpha.length; i++){
                if(this.take_step(i1, k0[i], E1)){
                    return 1;
                }
            }
        }
        return 0;

    };

    this.perm = function(N){
        var j, x, i;
        var a = [];
        for(i=0; i < N; i++){
            a[i] = i;
        }
        for (i = a.length; i; i--) {
            j = Math.floor(Math.random() * i);
            x = a[i - 1];
            a[i - 1] = a[j];
            a[j] = x;
        }
        return a;
    };

    this.train = function(X, Y, kernel, C, gamma, indexes){
        var i = 0, j = 0, numChanged = 0, examineAll = 0, ct = 0;
        var temp = [];
        this.alpha = new Array(indexes.length);
        this.E = new Array(indexes.length);
        this.b = 0;
        this.C = C;
        this.kernel_c = gamma;
        this.dec_indexes = [];

        /* store yi */
        this.yi = [];
        this.xi = [];           /* holds support vectors */
        for(i = 0; i < indexes.length; i++){
            this.yi[i] = Y[i];
            this.alpha[i] = 0;
            this.E[i] = 0;
        }
        for(i = 0; i < X.length; i++){
            this.xi[i] = [];
        }
        /* store kernel for future use */
        this.kernel = kernel;

        /* evaluate kernel for every pair of points */
        for( i = 0; i < indexes.length; i++){
            this.K[i] = [];
            for(j = 0; j < indexes.length; j++){
                this.K[i][j] = this.evaluate_kernel_train(X, indexes[i], indexes[j]);
            }
        }
       
        /* set tolerance for alpha change */
        this.tol = 0.001;
        numChanged = 0;
        examineAll = 1;

        while(numChanged>0 || examineAll){
            numChanged = 0;

            if(examineAll == 0){
                for(i = 0; i < this.dec_indexes.length; i++){
                    if(this.alpha[this.dec_indexes[i]]<this.C){
                        numChanged += this.examineExample(i);
                    }
                }
            }else{
                for(i = 0; i < this.alpha.length; i++){
                    numChanged += this.examineExample(i);
                }
            }
            if(examineAll == 1){
                examineAll = 0;
            }else if(numChanged == 0){
                examineAll = 0;
            }
            if(ct > 10000){
                
                break;
            }
            ct++;
        }


        /* store support vectors */
        this.yi = [];
        temp = [];

        for(i = 0; i < this.dec_indexes.length; i++){
            /* store targets */
            this.yi[i] = Y[this.dec_indexes[i]];

            /* store support vectors */
            for(j = 0; j < X.length; j++){
                this.xi[j][i] = X[j][indexes[this.dec_indexes[i]]];
            }
            /* store alpha */
            temp[i] = this.alpha[this.dec_indexes[i]];
        }
        /* copy support alphas to alpha */
        this.alpha = [];
        for(i = 0; i < temp.length; i++){
            this.alpha[i] = temp[i];
        }
    };

    this.evaluate_kernel = function(x, y){
        var val = 0, k = 0;

        switch(this.kernel){
            case 2:
                val = 0;
                for(k = 0; k < x.length; k++){
                    val += x[k] * y[k];
                }
                val += this.kernel_c;
                val *= val;
                /* val = ((x * y') + c) ^ 2; */
                break;
            case 3:
                val = 0;
                for(k = 0; k < x.length; k++){
                    val += (x[k] - y[k]) * (x[k] - y[k]);
                }
                val = Math.sqrt(val);
                val *= val;
                val *= (-this.kernel_c);
                val = Math.exp(val);

                /*val = exp((-c)*sqrt( (x - y ) * (x - y)' )^2); */
                break;
            default:
                /* linear kernel */
                val = 0;
                for(k = 0; k < x.length; k++){
                    val += x[k] * y[k];
                }
                break;
        }
        return val;
    };

    this.evaluate_kernel_train = function(X, i, j){
        var x = [], y = [], k = 0;
        for(k = 0; k < X.length; k++){
            x[k] = X[k][i];
            y[k] = X[k][j];
        }
        return this.evaluate_kernel(x,y);
    };

    this.predict_train = function(i){
        var result = 0, j = 0;

        for(j = 0; j < this.dec_indexes.length; j++){
            result +=  this.alpha[this.dec_indexes[j]] * this.yi[this.dec_indexes[j]] * this.K[this.dec_indexes[j]][i];
        }
        result -= this.b;
        return result;
    };

    this.predict = function(X){
        var  i = 0, j = 0, k = 0, x = [], y = [];
        var result = [];
        /* evaluate each row in X */
        for(i = 0; i < X[0].length; i++){
            result[i] = 0;
            /* build x and y */
            for(k = 0; k < X.length; k++){
                x[k] = X[k][i];
            }
            /* evaluate decision function */
            for(j = 0; j < this.alpha.length; j++){
                for(k = 0; k < this.xi.length; k++){
                    y[k] = this.xi[k][j];
                }
                result[i] += this.alpha[j] * this.yi[j] * this.evaluate_kernel( y, x);
            }
            result[i] -= this.b;
        }
        return result;
    };
    this.serialize = function(){
        var sObj = {alpha:[], xi:[], yi:[], tol:10^(-3), C:0, b:0, kernel:1, kernel_c:0.1};
        sObj.alpha = this.alpha.slice(0);
        sObj.yi = this.yi.slice(0);
        for(var i = 0; i < this.xi.length; i++){
            sObj.xi.push(this.xi[i]);
        }
        sObj.tol = this.tol;
        sObj.C = this.C;
        sObj.b = this.b;
        sObj.kernel = this.kernel;
        sObj.kernel_c = this.kernel_c;
        return sObj;
    };

    this.deserialize = function(sObj){
        this.alpha = sObj.alpha.slice(0);
        this.yi = sObj.yi.slice(0);
        for(var i = 0; i < sObj.xi.length; i++){
            this.xi.push(sObj.xi[i]);
        }
        this.tol = sObj.tol;
        this.C = sObj.C;
        this.b = sObj.b;
        this.kernel = sObj.kernel;
        this.kernel_c = sObj.kernel_c;
    };
};



var svm = function() {
    this.classifier = []; // array of smos
    this.type = 1;
    this.neg_class = [];
    this.pos_class = [];
    this.xmin = [];
    this.xmax = [];
    this.classes = [];
    this.mapped_data = [];

    // input datatable object
    this.get_scale_rep = function(X){
        var field_data = [];

        for(var i = 0; i < X.num_fields; i++) {
            field_data = X.get_field(i);
            this.xmin[i] = field_data[0];
            this.xmax[i] = field_data[0];

            for(var j = 0; j < field_data.length; j++){
                if(this.xmin[i] > field_data[j]){
                    this.xmin[i] = field_data[j];
                }

                if(this.xmax[i] < field_data[j]){
                    this.xmax[i] = field_data[j];
                }

            }
        }
    };
    this.scale_data = function(X){
        var field_data = [];
        var i = 0, j = 0;
        this.mapped_data = [];
        /* generate a new data table object but normalized */
        for(i = 0; i < X.num_fields; i++){
            field_data = X.get_field(i);

            /* map field data */
            for(j = 0; j < field_data.length; j++){
                field_data[j] = (field_data[j] - this.xmin[i]) / (this.xmax[i] - this.xmin[i]);
            }
            this.mapped_data.push(field_data);
        }
    };

    this.train = function(X, Y, kernel, C, gamma){
        var ct = 0, i = 0, j = 0, k = 0;
        var indexes = [];
        var fake_y = [];

        this.classifier = [];

        /* first do ordinary stuff like scalling data */
        /* get scale map */
        this.get_scale_rep(X);

        /* scale data */
        this.scale_data(X);

        /* now lets get into business, are we working with a multiclass problem or an anomaly detection one? */

        /* set classes */
        this.classes = this.unique(Y);

        /* compute kernel elements here (we should try to avoid expensive calculations)*/

        /* which type of problem are we dealing with? */
        if( this.classes.length > 1 ){
            this.type = 2;
            /* is is binary ? */

            /* construct a set of classifiers
             * N(N-1)/2 classifiers are required
             */
            ct = 0;
            for(i = 0; i < this.classes.length; i++){
                for(j = i+1; j < this.classes.length; j++){
                    this.pos_class[ct] = this.classes[i];
                    this.neg_class[ct] = this.classes[j];

                    /* construct the training set */
                    /* instead of manipulating the data use indexes for the rows */
                    fake_y = [];
                    indexes = [];
                    for(k = 0; k < Y.length; k++){
                        if(Y[k] == this.neg_class[ct]){
                            fake_y.push(-1);
                            indexes.push(k);
                        }else if(Y[k] == this.pos_class[ct]){
                            fake_y.push(1);
                            indexes.push(k);
                        }
                    }

                    this.classifier[ct] = new smo_wwss3();
                    this.classifier[ct].train(this.mapped_data, fake_y, kernel, C, gamma, indexes);
                    ct++;
                }
            }
        }else{
            /* no its anomaly detection (ups I'm still working on it :(*/
            this.type = 1;

        }
    };

    this.evaluate = function(X){
        var i = 0, j = 0, k = 0, index_of_neg_class = 0, index_of_pos_class = 0;
        var rij = [];
        var obj_e = {class_prob : [], predict_labels : [], class_names : []};
        if(this.type == 2){
            /* lets get rid of education data I think we don't need it anymore */
            this.mapped_data = [];

            /* scale new data */
            this.scale_data(X);

            /* allocate probability matrix (only needed for the roc curve) */
            for(i = 0; i < this.classes.length; i++){
                obj_e.class_prob[i] = new Array(X.num_rows).fill(0);

            }

            /* allocate class vector */
            for(i = 0; i < this.classes.length; i++){
                obj_e.class_names[i] = this.classes[i];
            }

            /* for each classifier */
            for(i = 0; i < this.pos_class.length; i++){
                index_of_pos_class = this.classes.indexOf(this.pos_class[i]);
                index_of_neg_class = this.classes.indexOf(this.neg_class[i]);

                rij = this.sign(this.classifier[i].predict(this.mapped_data));

                for(j = 0; j < rij.length; j++){
                    obj_e.class_prob[index_of_pos_class][j] += rij[j];
                    obj_e.class_prob[index_of_neg_class][j] -= rij[j];
                }
            }

            /* now compute the class of each sample */
            for(i = 0; i < obj_e.class_prob[0].length; i++){
                obj_e.predict_labels[i] = obj_e.class_prob[0][i];
                k = 0;
                for(j = 0; j < obj_e.class_prob.length; j++){
                    if(obj_e.class_prob[j][i]>obj_e.predict_labels[i]){
                        obj_e.predict_labels[i] = obj_e.class_prob[j][i];
                        k = j;
                    }
                }
                obj_e.predict_labels[i] = this.classes[k];
            }

        }else{

        }
        return obj_e;
    };

    this.get_decision_values = function(X, pos_class, neg_class){

        /* identify classifier */
        var index = 0, error = 0, val = 1, rij = [], i = 0;

        /* lets get rid of education data I think we don't need it anymore */
        this.mapped_data = [];

        if(pos_class == neg_class){
            return {decision_val: [], error: -1};
        }

        /* scale new data */
        this.scale_data(X);

        /* search for the classifier responsible for this descrimination */
        for(i = 0; i < this.pos_class.length; i++){
            if(this.pos_class[i] == pos_class && this.neg_class[i] == neg_class){
                index = i;
                val = 1;
                break;
            }

            if(this.pos_class[i] == neg_class && this.neg_class[i] == pos_class){
                index = i;
                val = -1;
                break;
            }
        }

        /* we are good to go */
        rij = this.classifier[index].predict(this.mapped_data);

        if(val < 0 ){
            for(i = 0; i < rij.length; i++){
                rij[i] = -rij[i];
            }
        }
        return {decision_val: rij, error: error};
    };

    this.sign = function(data){
        var result = [];
        for(var i = 0; i < data.length; i++){
            if(data[i]>=0){
                result[i] = 1;
            }else {
                result[i] = -1;
            }
        }
        return result;
    };

    this.unique = function (data){
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
    };

    this.serialize = function(){
        var sObj = { classifier:[], type:1, neg_class:[], pos_class:[], xmin:[], xmax:[], classes:[]};
        for(var i = 0; i < this.neg_class.length; i++){
            sObj.classifier[i] = this.classifier[i].serialize();
        }
        sObj.type = this.type;
        sObj.neg_class = this.neg_class.slice(0);
        sObj.pos_class = this.pos_class.slice(0);
        sObj.xmin = this.xmin.slice(0);
        sObj.xmax = this.xmax.slice(0);
        sObj.classes = this.classes.slice(0);
        return sObj;
    };

    this.deserialize = function(sObj){

        for(var i = 0; i < sObj.neg_class.length; i++){
            this.classifier[i] = new smo_wwss3();
            this.classifier[i].deserialize(sObj.classifier[i]);
        }
        this.type = sObj.type;
        this.neg_class = sObj.neg_class.slice(0);
        this.pos_class = sObj.pos_class.slice(0);
        this.xmin = sObj.xmin.slice(0);
        this.xmax = sObj.xmax.slice(0);
        this.classes = sObj.classes.slice(0);
    };

};