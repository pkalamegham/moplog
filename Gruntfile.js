/*global module:false*/
module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        // Task configuration.
        githooks : {
          all : {
              'pre-commit' : 'code-style'
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
                    module : true,
                    restify : true,
                    require : true,
                    assert : true,
                    process : true,
                    setTimeout : true,
                    /* Mocha */
                    describe : true,
                    it : true,
                    before : true,
                    beforeEach : true,
                    after : true,
                    afterEach : true
                }
          },
          gruntfile : {
              src : 'Gruntfile.js'
          },
          lib_test : {
              src : ['lib/**/*.js', 'test/**/*.js']
          },
          dev : ['Gruntfile.js', 'test/**/*.js'],
          app : ['app/**/*.js']
        },
        jscs : {
            src : '**/*.js',
            options : {
                config : '.jscsrc'
            }
        },
        watch : {
            gruntfile : {
            files : '<%= jshint.gruntfile.src %>',
            tasks : ['jshint:gruntfile']
            },
            lib_test : {
                files : '<%= jshint.lib_test.src %>',
                tasks : ['jshint:lib_test']
            }
        },
        mochacov : {
            options : {
                globals : ['expect'],
                timeout : 3000,
                ui : 'bdd',
                require : ['restify', 'assert']
            },
            test : {
                options : {
                    reporter : 'spec'
                }
            },
            coverage : {
                options : {
                    reporter : 'html-cov',
                    output : 'coverage.html'
                }
            },
            all : ['test/**/*.js']
        },
        open : {
            file : {
                path : './coverage.html'
            }
        },
        debug : {
            options : {
                open : true
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-mocha-cov');
    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-debug-task');
    grunt.loadNpmTasks('grunt-githooks');

    grunt.registerTask('lint', ['jshint', 'jscs']);
    grunt.registerTask('unit', ['mochacov:test']);
    grunt.registerTask('coverage', ['mochacov:coverage', 'open']);
    grunt.registerTask('test', ['lint', 'unit']);
    grunt.registerTask('server', 'Start moplog web service', function () {
        grunt.log.writeln('Started web service on port 8080');
        var done = this.async();
        require('./app/app').listen(8080).on('close', done);
    });
};
