angular.module('jasonGulpSeedApp', [
	'ui.router',
	'restangular'
])

.config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {

        $urlRouterProvider.otherwise('/');

        $stateProvider

            .state('home', {
                url: '/',
                templateUrl: 'components/home.html'
            });

    }]);