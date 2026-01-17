import { type NextRequest, NextResponse } from 'next/server';
import type { TestConnectionResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { apiEndpoint } = await request.json();

    if (!apiEndpoint) {
      return NextResponse.json<TestConnectionResponse>(
        {
          success: false,
          error: 'API endpoint is required',
        },
        { status: 400 },
      );
    }

    // Test connection by fetching the models list
    const modelsUrl = `${apiEndpoint}/models`;
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json<TestConnectionResponse>(
        {
          success: false,
          error: `Failed to connect: ${response.status} ${response.statusText} - ${errorText}`,
        },
        { status: 500 },
      );
    }

    const data = await response.json();

    // Validate response structure
    if (!data.data || !Array.isArray(data.data)) {
      return NextResponse.json<TestConnectionResponse>(
        {
          success: false,
          error: 'Invalid response format from API',
        },
        { status: 500 },
      );
    }

    return NextResponse.json<TestConnectionResponse>({
      success: true,
      models: data.data,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json<TestConnectionResponse>(
      {
        success: false,
        error: `Connection failed: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}
