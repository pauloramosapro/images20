import React, { Component } from 'react';



class ErrorBoundary extends Component {

  constructor(props) {

    super(props);

    this.state = { hasError: false, error: null };

  }



  static getDerivedStateFromError(error) {

    // Update state so the next render will show the fallback UI.

    return { hasError: true, error };

  }



  componentDidCatch(error, errorInfo) {

    // You can also log the error to an error reporting service

    console.error('Error caught by ErrorBoundary:', error, errorInfo);

  }



  render() {

    if (this.state.hasError) {

      // You can render any custom fallback UI

      return (

        <div className="p-4 bg-red-50 border-l-4 border-red-400">

          <div className="flex">

            <div className="flex-shrink-0">

              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">

                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />

              </svg>

            </div>

            <div className="ml-3">

              <p className="text-sm text-red-700">

                Er is iets misgegaan. Probeer de pagina te verversen.

              </p>

              {process.env.NODE_ENV === 'development' && (

                <details className="mt-2 text-sm text-red-600">

                  <summary className="cursor-pointer">Technische details</summary>

                  <div className="mt-1 p-2 bg-white rounded border border-red-200 overflow-auto max-h-32">

                    {this.state.error?.toString()}

                  </div>

                </details>

              )}

            </div>

          </div>

        </div>

      );

    }



    return this.props.children;

  }

}



export default ErrorBoundary;

