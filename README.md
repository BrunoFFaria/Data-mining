# Data Mining algorithms
In this repository the well known data mining algorithms support vector machines and random forests are implemented in javascript. 
Both algorithms implement only the minimal set of extensions for classification and can be appreciated working on http://biplabaveiro.x10host.com/?a=applet. I intend to add more features in the future, such as out-of bag estimation, error-handling, probability calculation, etc. However, for now this provides the necessary details for anyone looking to deepen their knowledge in these well known data-mining tools.

If you intend to test the demo, the files should be supplied as comma separated values (csv format). Each column header should identify the type of observation, the last column the category of the observation and the rows the observations. Just like this: 

var1 | var2 | class
--- | --- | ---
*dummy observation 1* | *dummy observation 1* | **dummy category 1**
*dummy observation 2* | *dummy observation 2* | **dummy category 2**
*...* | *...* | **...**
*dummy observation n* | *dummy observation n* | **dummy category 1**

The default values of the demo are known to typically work, however, you can play with them. As a side note, I should point out that while the demo can easily handle 1000 samples with 12 features, taking less than 1 minute, I don't know how it will behave for bigger datasets as only a single core is used for model calculation.

On the other hand if you came here to inspect the code, follow svm.js and rf.js. The remaining files are only support for these two. Finally, I distribute this code under a BSD License so if you use any of it please give me some credit. :)




