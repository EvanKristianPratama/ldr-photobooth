import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import Swal from 'sweetalert2';

// Mock Socket.io
vi.mock('socket.io-client', () => {
    return {
        io: vi.fn(() => ({
            on: vi.fn(),
            off: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
            id: 'mock-socket-id'
        }))
    };
});

// Mock SweetAlert2
vi.mock('sweetalert2', () => ({
    default: {
        fire: vi.fn(),
        close: vi.fn(),
        showLoading: vi.fn()
    }
}));

// Mock Navigator MediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
    value: {
        getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }]
        })
    },
    writable: true
});

// Mock import.meta.env
vi.stubGlobal('import', { meta: { env: { VITE_SERVER_URL: 'http://localhost:3000' } } });

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the main title', () => {
        render(<App />);
        expect(screen.getByText(/LDR Photobooth/i)).toBeInTheDocument();
    });

    it('shows inputs for Name and Code', () => {
        render(<App />);
        expect(screen.getByPlaceholderText(/Name/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Code/i)).toBeInTheDocument();
        expect(screen.getByText(/Generate Code/i)).toBeInTheDocument();
    });

    it('updates name input field', () => {
        render(<App />);
        const nameInput = screen.getByPlaceholderText(/Name/i);
        fireEvent.change(nameInput, { target: { value: 'Test User' } });
        expect(nameInput.value).toBe('Test User');
    });

    it('shows error warning if joining without name', () => {
        // We import Swal mocked
        render(<App />);

        const joinButton = screen.getByText(/Join Booth/i);
        fireEvent.click(joinButton);

        const SwalDefault = Swal;
        // Technically Swal is default import in App, so our mock should catch it
        // Check if Swal.fire was called
        expect(SwalDefault.fire).toHaveBeenCalledWith(expect.objectContaining({
            icon: 'warning',
            text: 'Please enter your name!'
        }));
    });
});
