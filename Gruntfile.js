/*global module:false*/
module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        // Task configuration.
        githooks : {
          all : {
              'pre-commit' : 'lint'
          }
        },
        jshint : {
            options : {
                curly : true,
                eqeqeq : true,
                immed : true,
                latedef : true,
                newcap : true,
                noarg : true,
                sub : true,
                undef : true,
                unused : true,
                boss : true,
                eqnull : true,
                quotmark : 'single',
                maxlen : 80,
                globals : {
                    assert : true,
                    console : true,
                    module : true,
                    path : true,
                    process : true,
                    require : true,
                    restify : true,
                    setTimeout : true,
                    /* Mocha */
                    describe : true,
                    it : true,
                    before : true,
                    beforeEach : true,
                    after : true,
                    afterEach : true,
                    /* Unit test globals */
                    insertTestResult : true,
                    updateTestResult : true,
                    deleteTestResult : true,
                    commandTestResult : true
                }
          },
          gruntfile : {
              src : 'Gruntfile.js'
          },
          lib : {
              src : ['lib/**/*.js', 'test/**/*.js']
          },
          dev : ['Gruntfile.js', 'test/**/*.js']
        },
        jscs : {
            src : '**/*.js',
            options : {
                config : '.jscsrc'
            }
        },
        mochacov : {
            unit : {
                options : {
                    reporter : 'spec'
                }
            },
            coverage : {
                options : {
                    reporter : 'mocha-term-cov-reporter',
                    coverage : true
                }
            },
            coveralls : {
                options : {
                    reporter : 'mocha-lcov-reporter',
                    coveralls : true
                }
            },
            options : {
                files : ['test/test*.js'],
                ui : 'bdd',
                colors : true
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-mocha-cov');
    grunt.loadNpmTasks('grunt-githooks');

    grunt.registerTask('lint', ['jshint', 'jscs']);
    grunt.registerTask('unit', ['mochacov:unit']);
    grunt.registerTask('cov', ['mochacov:coverage']);
    grunt.registerTask('test', ['lint', 'unit', 'cov']);
    grunt.registerTask('travis', ['test']);
};
